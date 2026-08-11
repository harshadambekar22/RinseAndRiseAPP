using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using RinseRise.Api.Data;
using RinseRise.Api.Dtos;
using RinseRise.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace RinseRise.Api.Services;

public interface IPaymentService
{
    Task<RazorpayOrderResponseDto> CreateRazorpayOrderAsync(int orderId);
    Task<bool> VerifyAndMarkPaidAsync(VerifyPaymentDto dto);

    /// <summary>Handles a Razorpay webhook delivery: verifies its signature against the
    /// raw body, then reconciles Order/Payment status from the event. Returns false only
    /// when the signature doesn't check out (controller should then return 400 so Razorpay
    /// knows to fix its config — never retries help there).</summary>
    Task<bool> ProcessWebhookAsync(string rawBody, string? signature);
}

/// <summary>
/// Talks to Razorpay over plain HTTPS using HTTP Basic auth (KeyId:KeySecret),
/// so the only crypto needed is the built-in HMAC-SHA256 used to verify the
/// payment signature. No third-party SDK required.
/// Docs: https://razorpay.com/docs/api/orders/  and  /docs/payments/payment-gateway/web-integration/
/// </summary>
public class RazorpayService : IPaymentService
{
    private readonly AppDbContext _db;
    private readonly ISettingsService _settings;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<RazorpayService> _log;
    private readonly IOrderService _orders;

    public RazorpayService(AppDbContext db, ISettingsService settings,
        IHttpClientFactory httpFactory, ILogger<RazorpayService> log, IOrderService orders)
    {
        _db = db; _settings = settings; _httpFactory = httpFactory; _log = log; _orders = orders;
    }

    // Admin → API Keys (Settings table) wins if set, else appsettings.json.
    private async Task<(string keyId, string keySecret)> KeysAsync() => (
        await _settings.GetOrConfigAsync(SettingKeys.RazorpayKeyId, "Razorpay:KeyId"),
        await _settings.GetOrConfigAsync(SettingKeys.RazorpayKeySecret, "Razorpay:KeySecret"));

    private Task<string> WebhookSecretAsync() =>
        _settings.GetOrConfigAsync(SettingKeys.RazorpayWebhookSecret, "Razorpay:WebhookSecret");

    public async Task<RazorpayOrderResponseDto> CreateRazorpayOrderAsync(int orderId)
    {
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.Id == orderId)
                    ?? throw new InvalidOperationException("Order not found.");

        var (keyId, keySecret) = await KeysAsync();
        long amountPaise = (long)Math.Round(order.Total * 100m);

        // If keys are not configured yet, fall back to a mock order id so the
        // UI flow can be developed end-to-end before Razorpay onboarding finishes.
        if (string.IsNullOrWhiteSpace(keySecret) || keySecret.StartsWith("YOUR_"))
        {
            _log.LogWarning("Razorpay keys not set — returning a MOCK order id. Set them in appsettings to go live.");
            order.RazorpayOrderId = $"order_MOCK{Guid.NewGuid():N}".Substring(0, 22);
            await _db.SaveChangesAsync();
            return new RazorpayOrderResponseDto(order.RazorpayOrderId, keyId, amountPaise, "INR",
                order.OrderNumber, order.CustomerName, order.CustomerPhone);
        }

        var client = _httpFactory.CreateClient();
        var basic = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{keyId}:{keySecret}"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", basic);

        var payload = JsonSerializer.Serialize(new
        {
            amount = amountPaise,
            currency = "INR",
            receipt = order.OrderNumber,
            notes = new { orderNumber = order.OrderNumber }
        });

        using var content = new StringContent(payload, Encoding.UTF8, "application/json");
        var resp = await client.PostAsync("https://api.razorpay.com/v1/orders", content);
        var body = await resp.Content.ReadAsStringAsync();
        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException($"Razorpay error ({(int)resp.StatusCode}): {body}");

        using var doc = JsonDocument.Parse(body);
        var rzpOrderId = doc.RootElement.GetProperty("id").GetString()!;

        order.RazorpayOrderId = rzpOrderId;
        _db.Payments.Add(new Payment
        {
            OrderId = order.Id, Provider = "Razorpay", ProviderOrderId = rzpOrderId,
            Amount = order.Total, Method = "online", Status = PaymentStatus.Pending
        });
        await _db.SaveChangesAsync();

        return new RazorpayOrderResponseDto(rzpOrderId, keyId, amountPaise, "INR",
            order.OrderNumber, order.CustomerName, order.CustomerPhone);
    }

    public async Task<bool> VerifyAndMarkPaidAsync(VerifyPaymentDto dto)
    {
        var (_, keySecret) = await KeysAsync();
        var order = await _db.Orders.FirstOrDefaultAsync(o => o.RazorpayOrderId == dto.RazorpayOrderId);
        if (order is null) return false;

        // MOCK orders (created before keys were set) skip signature checking.
        bool isMock = dto.RazorpayOrderId.Contains("MOCK");
        bool signatureOk = isMock || VerifySignature(dto.RazorpayOrderId, dto.RazorpayPaymentId, dto.RazorpaySignature, keySecret);

        var payment = await _db.Payments
            .Where(p => p.ProviderOrderId == dto.RazorpayOrderId)
            .OrderByDescending(p => p.Id).FirstOrDefaultAsync();

        if (!signatureOk)
        {
            order.PaymentStatus = PaymentStatus.Failed;
            if (payment is not null) payment.Status = PaymentStatus.Failed;
            await _db.SaveChangesAsync();
            return false;
        }

        order.PaymentStatus = PaymentStatus.Paid;
        order.RazorpayPaymentId = dto.RazorpayPaymentId;
        if (order.Status == OrderStatus.Placed || order.Status == OrderStatus.PickupScheduled)
            order.Status = OrderStatus.PickupScheduled;

        if (payment is not null)
        {
            payment.Status = PaymentStatus.Paid;
            payment.ProviderPaymentId = dto.RazorpayPaymentId;
        }
        await _db.SaveChangesAsync();
        await _orders.SendBillIfDueAsync(order.Id, preferWhatsApp: true);
        return true;
    }

    /// <summary>HMAC-SHA256 of "orderId|paymentId" keyed with the secret must equal the signature.</summary>
    private static bool VerifySignature(string orderId, string paymentId, string signature, string secret)
    {
        if (string.IsNullOrEmpty(secret)) return false;
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes($"{orderId}|{paymentId}"));
        var expected = Convert.ToHexString(hash).ToLowerInvariant();
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signature.ToLowerInvariant()));
    }

    /// <summary>
    /// Server-to-server source of truth for payment/refund status. The client-driven
    /// /verify call above only fires if the customer's browser is still around when
    /// checkout finishes — it misses payments that settle asynchronously (UPI collect
    /// requests, net-banking), a closed tab/dropped network right after a successful
    /// charge, and refunds issued from the Razorpay dashboard. This handler covers all
    /// of those by reacting to the events Razorpay pushes to /payments/razorpay/webhook.
    /// Docs: https://razorpay.com/docs/webhooks/
    /// </summary>
    public async Task<bool> ProcessWebhookAsync(string rawBody, string? signature)
    {
        var webhookSecret = await WebhookSecretAsync();
        if (string.IsNullOrWhiteSpace(webhookSecret) || webhookSecret.StartsWith("YOUR_"))
        {
            _log.LogWarning("Razorpay webhook received but no webhook secret is configured — ignoring.");
            return false;
        }
        if (!VerifyWebhookSignature(rawBody, signature, webhookSecret))
        {
            _log.LogWarning("Razorpay webhook signature verification failed.");
            return false;
        }

        using var doc = JsonDocument.Parse(rawBody);
        var root = doc.RootElement;
        var eventName = root.TryGetProperty("event", out var evEl) ? evEl.GetString() ?? "" : "";

        // payment.*, order.paid and refund.* deliveries all carry a "payment" entity
        // in their payload, which is all we need to locate the order.
        if (!root.TryGetProperty("payload", out var payloadEl) ||
            !payloadEl.TryGetProperty("payment", out var paymentEl) ||
            !paymentEl.TryGetProperty("entity", out var entity))
        {
            _log.LogInformation("Razorpay webhook event {Event} has no payment entity — nothing to reconcile.", eventName);
            return true;
        }

        var razorpayOrderId = entity.TryGetProperty("order_id", out var oid) ? oid.GetString() : null;
        var razorpayPaymentId = entity.TryGetProperty("id", out var pid) ? pid.GetString() : null;
        if (string.IsNullOrEmpty(razorpayOrderId)) return true;

        var order = await _db.Orders.FirstOrDefaultAsync(o => o.RazorpayOrderId == razorpayOrderId);
        if (order is null)
        {
            _log.LogWarning("Razorpay webhook {Event} for unknown order {OrderId} — nothing to reconcile.", eventName, razorpayOrderId);
            return true; // ack so Razorpay stops retrying; we truly have no matching order
        }

        var payment = await _db.Payments
            .Where(p => p.ProviderOrderId == razorpayOrderId)
            .OrderByDescending(p => p.Id).FirstOrDefaultAsync();

        switch (eventName)
        {
            case "payment.captured":
            case "order.paid":
                order.PaymentStatus = PaymentStatus.Paid;
                if (!string.IsNullOrEmpty(razorpayPaymentId)) order.RazorpayPaymentId = razorpayPaymentId;
                if (order.Status == OrderStatus.Placed) order.Status = OrderStatus.PickupScheduled;
                if (payment is not null)
                {
                    payment.Status = PaymentStatus.Paid;
                    if (!string.IsNullOrEmpty(razorpayPaymentId)) payment.ProviderPaymentId = razorpayPaymentId;
                }
                order.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                await _orders.SendBillIfDueAsync(order.Id, preferWhatsApp: true);
                return true;

            case "payment.failed":
                // Never let a stale/late failure event downgrade an order that
                // another (successful) payment attempt already settled.
                if (order.PaymentStatus != PaymentStatus.Paid) order.PaymentStatus = PaymentStatus.Failed;
                if (payment is not null && payment.Status != PaymentStatus.Paid) payment.Status = PaymentStatus.Failed;
                break;

            case "refund.created":
            case "refund.processed":
                order.PaymentStatus = PaymentStatus.Refunded;
                if (payment is not null) payment.Status = PaymentStatus.Refunded;
                break;

            default:
                _log.LogInformation("Razorpay webhook event {Event} received — no status change defined for it.", eventName);
                return true;
        }

        order.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    /// <summary>HMAC-SHA256 of the raw request body keyed with the webhook secret must equal
    /// the X-Razorpay-Signature header — different scheme (and secret) than the Checkout
    /// handler's per-payment signature in <see cref="VerifySignature"/>.</summary>
    private static bool VerifyWebhookSignature(string rawBody, string? signature, string secret)
    {
        if (string.IsNullOrEmpty(secret) || string.IsNullOrEmpty(signature)) return false;
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(rawBody));
        var expected = Convert.ToHexString(hash).ToLowerInvariant();
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signature.ToLowerInvariant()));
    }
}
