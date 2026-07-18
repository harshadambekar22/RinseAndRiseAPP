using System.ComponentModel.DataAnnotations;

namespace RinseRise.Api.Models;

public class User
{
    public int Id { get; set; }

    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(20)]
    public string? Phone { get; set; }

    /// <summary>Null for users who only ever sign in with Google.</summary>
    public string? PasswordHash { get; set; }

    /// <summary>Google "sub" claim, set when the account is linked to Google.</summary>
    [MaxLength(120)]
    public string? GoogleId { get; set; }

    public UserRole Role { get; set; } = UserRole.Customer;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>PBKDF2 hash (same format as PasswordHash) of the current
    /// "forgot password" one-time code, if a reset is in progress.</summary>
    [MaxLength(160)]
    public string? PasswordResetCodeHash { get; set; }

    public DateTime? PasswordResetExpiresAt { get; set; }

    /// <summary>Failed verify attempts against the current code. The code is
    /// invalidated once this hits the limit, forcing a fresh one.</summary>
    public int PasswordResetAttempts { get; set; }

    public List<Address> Addresses { get; set; } = new();
    public List<Order> Orders { get; set; } = new();
}
