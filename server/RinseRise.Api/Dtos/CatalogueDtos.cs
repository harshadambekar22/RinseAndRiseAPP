namespace RinseRise.Api.Dtos;

public record CategoryDto(int Id, string Name, string Slug, string Icon, string? ImageUrl, int SortOrder, int ItemCount);

public record CategoryUpsertDto(string Name, string? Slug, string Icon, string? ImageUrl, int SortOrder, bool IsActive);

/// <summary>A catalogue item with its effective (possibly discounted) price.</summary>
public record ClothTypeDto(
    int Id, string Name, string? Description, string? Overview, string Service,
    int CategoryId, string CategoryName, string CategorySlug,
    decimal PricePerPiece, decimal Price, decimal DiscountAmount, string? OfferTitle, string Icon);

/// <summary>Full catalogue item record for the admin list — includes hidden items and no offer/pricing math.</summary>
public record ClothTypeAdminDto(
    int Id, string Name, string Service, int CategoryId, string CategoryName,
    decimal PricePerPiece, string Icon, bool IsActive);

/// <summary>Create/update payload for a catalogue item (admin).</summary>
public record ClothTypeUpsertDto(
    string Name, string Service, int CategoryId, decimal PricePerPiece, string Icon, bool IsActive);

public record ProcessStepDto(int StepNumber, string Title, string Description, string Icon);

/// <summary>Everything the homepage needs in one call.</summary>
public record HomeDto(
    string Headline,
    string BusinessPhone,
    bool PickupSchedulingEnabled,
    List<OfferDto> Offers,
    List<CategoryDto> Categories,
    List<ProcessStepDto> ProcessSteps,
    List<ClothTypeDto> FeaturedDiscounts);
