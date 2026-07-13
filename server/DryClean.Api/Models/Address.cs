using System.ComponentModel.DataAnnotations;

namespace DryClean.Api.Models;

/// <summary>A saved pickup/drop location, including map coordinates.</summary>
public class Address
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User? User { get; set; }

    [MaxLength(60)]
    public string Label { get; set; } = "Home";

    [Required, MaxLength(250)]
    public string Line1 { get; set; } = string.Empty;

    [MaxLength(250)]
    public string? Line2 { get; set; }

    [MaxLength(120)]
    public string City { get; set; } = string.Empty;

    [MaxLength(120)]
    public string State { get; set; } = string.Empty;

    [MaxLength(10)]
    public string Pincode { get; set; } = string.Empty;

    // Captured from the Google Maps marker on the schedule page.
    public double Latitude { get; set; }
    public double Longitude { get; set; }
}
