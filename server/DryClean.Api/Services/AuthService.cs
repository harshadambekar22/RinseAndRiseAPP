using System.Security.Cryptography;
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
    Task ForgotPasswordAsync(ForgotPasswordDto dto);
    Task<bool> VerifyResetCodeAsync(VerifyResetCodeDto dto);
    Task ResetPasswordAsync(ResetPasswordDto dto);
}

public class AuthService : IAuthService
{
    private const int ResetCodeExpiryMinutes = 10;
    private const int MaxResetAttempts = 5;

    private readonly AppDbContext _db;
    private readonly ITokenService _tokens;
    private readonly ISettingsService _settings;
    private readonly IEmailService _email;

    public AuthService(AppDbContext db, ITokenService tokens, ISettingsService settings, IEmailService email)
    {
        _db = db; _tokens = tokens; _settings = settings; _email = email;
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

    public async Task ForgotPasswordAsync(ForgotPasswordDto dto)
    {
        var email = dto.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        // Don't reveal whether the account exists — always no-op silently for
        // an unknown email so the response can't be used to enumerate users.
        if (user is null) return;

        var code = RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");
        user.PasswordResetCodeHash = PasswordHasher.Hash(code);
        user.PasswordResetExpiresAt = DateTime.UtcNow.AddMinutes(ResetCodeExpiryMinutes);
        user.PasswordResetAttempts = 0;
        await _db.SaveChangesAsync();

        await _email.SendPasswordResetCodeAsync(user.Email, user.Name, code);
    }

    public async Task<bool> VerifyResetCodeAsync(VerifyResetCodeDto dto) =>
        await CheckResetCodeAsync(dto.Email, dto.Code) is not null;

    public async Task ResetPasswordAsync(ResetPasswordDto dto)
    {
        var user = await CheckResetCodeAsync(dto.Email, dto.Code)
            ?? throw new InvalidOperationException("That code is invalid or has expired. Request a new one.");

        user.PasswordHash = PasswordHasher.Hash(dto.NewPassword);
        user.PasswordResetCodeHash = null;
        user.PasswordResetExpiresAt = null;
        user.PasswordResetAttempts = 0;
        await _db.SaveChangesAsync();
    }

    /// <summary>Validates the code against the stored hash, expiry, and attempt
    /// limit; increments the attempt counter on a miss. Returns the user on
    /// success, null otherwise — never throws, so callers decide how to report it.</summary>
    private async Task<User?> CheckResetCodeAsync(string email, string code)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user?.PasswordResetCodeHash is null || user.PasswordResetExpiresAt is null) return null;

        if (user.PasswordResetExpiresAt < DateTime.UtcNow || user.PasswordResetAttempts >= MaxResetAttempts)
        {
            // Expired or brute-forced past the attempt limit — invalidate so a
            // stale/guessed code can't be retried indefinitely.
            user.PasswordResetCodeHash = null;
            user.PasswordResetExpiresAt = null;
            await _db.SaveChangesAsync();
            return null;
        }

        if (!PasswordHasher.Verify(code, user.PasswordResetCodeHash))
        {
            user.PasswordResetAttempts++;
            await _db.SaveChangesAsync();
            return null;
        }

        return user;
    }

    private AuthResponseDto ToResponse(User u) =>
        new(_tokens.CreateToken(u), u.Id, u.Name, u.Email, u.Role.ToString());
}
