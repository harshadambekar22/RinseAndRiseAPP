namespace DryClean.Api.Dtos;

public record OfferDto(
    int Id, string Title, string? Description, string DiscountType, decimal DiscountValue,
    string Target, int? CategoryId, string? CategoryName, int? ClothTypeId, string? ClothTypeName,
    string? Code, DateTime StartsAt, DateTime EndsAt, bool IsActive, bool ShowOnHome,
    string? BannerImageUrl, bool IsCurrentlyActive);

/// <summary>Create/update payload for an offer (admin).</summary>
public record OfferUpsertDto(
    string Title, string? Description, string DiscountType, decimal DiscountValue,
    string Target, int? CategoryId, int? ClothTypeId, string? Code,
    DateTime StartsAt, DateTime EndsAt, bool IsActive, bool ShowOnHome, string? BannerImageUrl);
