using System.ComponentModel.DataAnnotations;

namespace DryClean.Api.Models;

/// <summary>A catalogue item the customer can pick, e.g. "Shirt — Dry Clean".</summary>
public class ClothType
{
    public int Id { get; set; }

    [Required, MaxLength(120)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(300)]
    public string? Description { get; set; }

    /// <summary>Longer marketing/care copy shown on the item's detail view.</summary>
    [MaxLength(800)]
    public string? Overview { get; set; }

    /// <summary>The category this item belongs to (Men, Women, Curtains, …).</summary>
    public int CategoryId { get; set; }
    public Category? Category { get; set; }

    public ServiceType Service { get; set; } = ServiceType.DryClean;

    /// <summary>Price for a single piece, in INR.</summary>
    public decimal PricePerPiece { get; set; }

    /// <summary>Lucide icon name used by the React UI.</summary>
    [MaxLength(40)]
    public string Icon { get; set; } = "shirt";

    public bool IsActive { get; set; } = true;
}
