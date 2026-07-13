using System.ComponentModel.DataAnnotations;

namespace DryClean.Api.Models;

/// <summary>An admin-created discount that runs for a set time window and can
/// be advertised on the homepage (optionally with an uploaded pamphlet image).</summary>
public class Offer
{
    public int Id { get; set; }

    [Required, MaxLength(120)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(400)]
    public string? Description { get; set; }

    public DiscountType DiscountType { get; set; } = DiscountType.Percentage;

    /// <summary>Percent (0–100) when Percentage, or rupees off when Flat.</summary>
    public decimal DiscountValue { get; set; }

    public OfferTarget Target { get; set; } = OfferTarget.AllItems;

    /// <summary>Set when Target = Category.</summary>
    public int? CategoryId { get; set; }
    public Category? Category { get; set; }

    /// <summary>Set when Target = ClothType.</summary>
    public int? ClothTypeId { get; set; }
    public ClothType? ClothType { get; set; }

    /// <summary>Optional coupon code (informational; shown to customers).</summary>
    [MaxLength(40)]
    public string? Code { get; set; }

    public DateTime StartsAt { get; set; } = DateTime.UtcNow;
    public DateTime EndsAt { get; set; } = DateTime.UtcNow.AddDays(7);

    public bool IsActive { get; set; } = true;

    /// <summary>Show this as a promo banner/pamphlet on the homepage.</summary>
    public bool ShowOnHome { get; set; } = true;

    /// <summary>Uploaded pamphlet/banner image (relative path under /uploads).</summary>
    [MaxLength(400)]
    public string? BannerImageUrl { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
