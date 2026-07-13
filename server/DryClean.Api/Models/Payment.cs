namespace DryClean.Api.Models;

/// <summary>An audit record for each payment attempt against an order.</summary>
public class Payment
{
    public int Id { get; set; }

    public int OrderId { get; set; }
    public Order? Order { get; set; }

    public string Provider { get; set; } = "Razorpay";
    public string? ProviderOrderId { get; set; }
    public string? ProviderPaymentId { get; set; }

    public decimal Amount { get; set; }
    public string Method { get; set; } = "online"; // upi | card | qr | pos | cash
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
