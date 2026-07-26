using RinseRise.Api.Dtos;
using RinseRise.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace RinseRise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _payments;
    public PaymentsController(IPaymentService payments) => _payments = payments;

    /// <summary>Step 1: create a Razorpay order for an existing app order.
    /// Returns the keyId + amount the React Checkout widget needs.</summary>
    [Authorize]
    [HttpPost("razorpay/order")]
    public async Task<ActionResult<RazorpayOrderResponseDto>> CreateRazorpayOrder(CreateRazorpayOrderDto dto)
    {
        try { return Ok(await _payments.CreateRazorpayOrderAsync(dto.OrderId)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Step 2: verify the signature Razorpay returns and mark the order paid.</summary>
    [Authorize]
    [HttpPost("razorpay/verify")]
    public async Task<IActionResult> Verify(VerifyPaymentDto dto)
    {
        var ok = await _payments.VerifyAndMarkPaidAsync(dto);
        return ok
            ? Ok(new { status = "paid" })
            : BadRequest(new { status = "failed", message = "Signature verification failed." });
    }

    /// <summary>Server-to-server: Razorpay calls this directly (no user session, hence no
    /// [Authorize]) whenever a payment or refund's status changes, so our records stay
    /// correct even if the customer's browser never comes back to call /verify. Reads the
    /// body as raw text — the signature is computed over the exact bytes Razorpay sent, so
    /// binding it into a DTO and re-serializing would break the HMAC comparison.</summary>
    [HttpPost("razorpay/webhook")]
    public async Task<IActionResult> Webhook()
    {
        using var reader = new StreamReader(Request.Body);
        var rawBody = await reader.ReadToEndAsync();
        var signature = Request.Headers["X-Razorpay-Signature"].ToString();

        var ok = await _payments.ProcessWebhookAsync(rawBody, signature);
        return ok ? Ok(new { status = "ok" }) : BadRequest(new { status = "invalid signature" });
    }
}
