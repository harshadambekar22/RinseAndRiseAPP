using System.ComponentModel.DataAnnotations;

namespace DryClean.Api.Dtos;

/// <summary>Counter billing by an admin for a walk-in customer.</summary>
public record ShopBillingDto(
    [Required, MinLength(1)] List<OrderItemInputDto> Items,
    [Required] string CustomerName,
    [Required] string CustomerPhone,
    [Required] string PaymentMethod,   // upi | card | qr | pos | cash
    bool SendWhatsApp = true,
    string? Notes = null);

public record UserViewDto(int Id, string Name, string Email, string? Phone, string Role, DateTime CreatedAt, int OrderCount);

public record DashboardSummaryDto(
    int TotalOrders,
    int OrdersToday,
    decimal RevenueTotal,
    decimal RevenueToday,
    int PendingPickups,
    int InCleaning,
    int CustomerCount);
