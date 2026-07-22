using System.ComponentModel.DataAnnotations;

namespace RinseRise.Api.Dtos;

public record OrderItemInputDto(
    [Required] int ClothTypeId,
    [Range(1, 999)] int Quantity);

public record AddressInputDto(
    string Label,
    [Required] string Line1,
    string? Line2,
    string City,
    string State,
    string Pincode,
    double Latitude,
    double Longitude);

public record CreateOrderDto(
    [Required, MinLength(1)] List<OrderItemInputDto> Items,
    AddressInputDto? PickupAddress,
    DateTime? ScheduledPickupAt,
    string? Notes);

public record UpdateStatusDto([Required] string Status);

// --- Read models returned to the client ---

public record OrderItemViewDto(
    int ClothTypeId, string Name, decimal OriginalUnitPrice, decimal UnitPrice,
    int Quantity, decimal LineTotal, decimal LineDiscount);

public record OrderViewDto(
    int Id,
    string OrderNumber,
    string CustomerName,
    string CustomerPhone,
    string? CustomerEmail,
    string Channel,
    string Status,
    string PaymentStatus,
    decimal SubTotal,
    decimal DiscountTotal,
    decimal TaxAmount,
    decimal DeliveryFee,
    decimal Total,
    string? PickupAddressText,
    DateTime? ScheduledPickupAt,
    DateTime CreatedAt,
    List<OrderItemViewDto> Items);
