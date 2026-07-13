using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using DryClean.Api.Data;
using DryClean.Api.Dtos;
using DryClean.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DryClean.Api.Services;

public interface IPaymentService
{
    Task<RazorpayOrderResponseDto> CreateRazorpayOrderAsync(int orderId);
    Task<bool> VerifyAndMarkPaidAsync(VerifyPaymentDto dto);
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

    public RazorpayService(AppDbContext db, ISettingsService settings,
        IHttpClientFactory httpFactory, ILogger<RazorpayService> log)
    {
        _db = db; _settings = settings; _httpFactory = httpFactory; _log = log;
    }

    // Admin → API Keys (Settings table) wins if set, else appsettings.json.
    private async Task<(string keyId, string keySecret)> KeysAsync() => (
        await _settings.GetOrConfigAsync(SettingKeys.RazorpayKeyId, "Razorpay:KeyId"),
        await _settings.GetOrConfigAsync(SettingKeys.RazorpayKeySecret, "Razorpay:KeySecret"));

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
}
