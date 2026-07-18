using System.ComponentModel.DataAnnotations;

namespace RinseRise.Api.Dtos;

/// <summary>Ask the backend to create a Razorpay order for an existing app order.</summary>
public record CreateRazorpayOrderDto([Required] int OrderId);

public record RazorpayOrderResponseDto(
    string RazorpayOrderId,
    string KeyId,
    long AmountPaise,
    string Currency,
    string OrderNumber,
    string CustomerName,
    string CustomerPhone);

/// <summary>The three values Razorpay Checkout hands back on success, used to verify the signature.</summary>
public record VerifyPaymentDto(
    [Required] string RazorpayOrderId,
    [Required] string RazorpayPaymentId,
    [Required] string RazorpaySignature);
