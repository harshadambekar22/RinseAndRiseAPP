using System.ComponentModel.DataAnnotations;

namespace DryClean.Api.Dtos;

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
