using System.ComponentModel.DataAnnotations;

namespace RinseRise.Api.Dtos;

public record RegisterDto(
    [Required, MaxLength(120)] string Name,
    [Required, EmailAddress] string Email,
    [Required, MinLength(6)] string Password,
    string? Phone);

public record LoginDto(
    [Required, EmailAddress] string Email,
    [Required] string Password);

/// <summary>The "credential" string returned by Google Identity Services on the client.</summary>
public record GoogleLoginDto([Required] string IdToken);

public record AuthResponseDto(
    string Token,
    int UserId,
    string Name,
    string Email,
    string Role);

public record ForgotPasswordDto([Required, EmailAddress] string Email);

public record VerifyResetCodeDto(
    [Required, EmailAddress] string Email,
    [Required, StringLength(6, MinimumLength = 6)] string Code);

public record ResetPasswordDto(
    [Required, EmailAddress] string Email,
    [Required, StringLength(6, MinimumLength = 6)] string Code,
    [Required, MinLength(6)] string NewPassword);
