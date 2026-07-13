using System.ComponentModel.DataAnnotations;

namespace DryClean.Api.Models;

/// <summary>A single "how it works" step shown on the homepage,
/// e.g. Book → Pickup → Clean → Deliver.</summary>
public class ProcessStep
{
    public int Id { get; set; }

    public int StepNumber { get; set; }

    [Required, MaxLength(80)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(300)]
    public string Description { get; set; } = string.Empty;

    /// <summary>Lucide icon name used by the React UI.</summary>
    [MaxLength(40)]
    public string Icon { get; set; } = "sparkles";

    public bool IsActive { get; set; } = true;
}
