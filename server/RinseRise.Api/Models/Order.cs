using System.ComponentModel.DataAnnotations;

namespace RinseRise.Api.Models;

public class Order
{
    public int Id { get; set; }

    /// <summary>Human-friendly reference shown on the bill, e.g. DC-20260630-0007.</summary>
    [MaxLength(30)]
    public string OrderNumber { get; set; } = string.Empty;

    /// <summary>Null for walk-in shop orders that have no website account.</summary>
    public int? UserId { get; set; }
    public User? User { get; set; }

    [MaxLength(120)]
    public string CustomerName { get; set; } = string.Empty;

    [MaxLength(20)]
    public string CustomerPhone { get; set; } = string.Empty;

    public OrderChannel Channel { get; set; } = OrderChannel.Online;
    public OrderStatus Status { get; set; } = OrderStatus.Placed;

    public List<OrderItem> Items { get; set; } = new();

    // Money (all INR). GST is illustrative; adjust to your accountant's advice.
    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal DeliveryFee { get; set; }
    public decimal Total { get; set; }

    // Pickup / drop scheduling
    public string? PickupAddressText { get; set; }
    public double? PickupLatitude { get; set; }
    public double? PickupLongitude { get; set; }
    public DateTime? ScheduledPickupAt { get; set; }

    // Payment
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
    public string? RazorpayOrderId { get; set; }
    public string? RazorpayPaymentId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [MaxLength(500)]
    public string? Notes { get; set; }
}
