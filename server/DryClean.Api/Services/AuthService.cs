using DryClean.Api.Data;
using DryClean.Api.Dtos;
using DryClean.Api.Models;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;

namespace DryClean.Api.Services;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto?> LoginAsync(LoginDto dto);
    Task<AuthResponseDto> GoogleLoginAsync(GoogleLoginDto dto);
}

public class AuthService : IAuthService
{
    private readonly AppDbContext _db;
    private readonly ITokenService _tokens;
    private readonly ISettingsService _settings;

    public AuthService(AppDbContext db, ITokenService tokens, ISettingsService settings)
    {
        _db = db; _tokens = tokens; _settings = settings;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        var email = dto.Email.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(u => u.Email == email))
            throw new InvalidOperationException("An account with this email already exists.");

        var user = new User
        {
            Name = dto.Name.Trim(),
            Email = email,
            Phone = dto.Phone,
            PasswordHash = PasswordHasher.Hash(dto.Password),
            Role = UserRole.Customer
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        return ToResponse(user);
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginDto dto)
    {
        var email = dto.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user?.PasswordHash is null) return null;
        if (!PasswordHasher.Verify(dto.Password, user.PasswordHash)) return null;
        return ToResponse(user);
    }

    public async Task<AuthResponseDto> GoogleLoginAsync(GoogleLoginDto dto)
    {
        // Verifies the Google ID token's signature, expiry, and audience.
        var clientId = await _settings.GetOrConfigAsync(SettingKeys.GoogleClientId, "Google:ClientId");
        var validation = new GoogleJsonWebSignature.ValidationSettings
        {
            Audience = string.IsNullOrWhiteSpace(clientId) ? null : new[] { clientId }
        };

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(dto.IdToken, validation);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException("Google sign-in failed: " + ex.Message);
        }

        var email = payload.Email.ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null)
        {
            user = new User
            {
                Name = payload.Name ?? email,
                Email = email,
                GoogleId = payload.Subject,
                Role = UserRole.Customer
            };
            _db.Users.Add(user);
        }
        else if (string.IsNullOrEmpty(user.GoogleId))
        {
            user.GoogleId = payload.Subject; // link Google to an existing email account
        }

        await _db.SaveChangesAsync();
        return ToResponse(user);
    }

    private AuthResponseDto ToResponse(User u) =>
        new(_tokens.CreateToken(u), u.Id, u.Name, u.Email, u.Role.ToString());
}
