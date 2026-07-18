using System.ComponentModel.DataAnnotations;

namespace RinseRise.Api.Models;

/// <summary>A grouping of garments shown to both customers and admins,
/// e.g. Men, Women, Kids, Curtains, Sofa &amp; Couch Covers, Shoes.</summary>
public class Category
{
    public int Id { get; set; }

    [Required, MaxLength(80)]
    public string Name { get; set; } = string.Empty;

    /// <summary>URL-friendly identifier used for filtering, e.g. "sofa-covers".</summary>
    [MaxLength(80)]
    public string Slug { get; set; } = string.Empty;

    /// <summary>Lucide icon name used by the React UI.</summary>
    [MaxLength(40)]
    public string Icon { get; set; } = "shirt";

    /// <summary>Optional banner/thumbnail image (relative path under /uploads).</summary>
    [MaxLength(400)]
    public string? ImageUrl { get; set; }

    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
