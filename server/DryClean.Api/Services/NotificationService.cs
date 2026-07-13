using System.Net.Http.Headers;
using System.Text;
using DryClean.Api.Dtos;
using DryClean.Api.Models;

namespace DryClean.Api.Services;

public interface INotificationService
{
    /// <summary>Sends the bill to the customer over WhatsApp, falling back to SMS.</summary>
    Task<string> SendBillAsync(OrderViewDto order, bool preferWhatsApp);
}

/// <summary>
/// Logs the message to the console until Twilio keys are configured — either
/// in appsettings.json, or (no redeploy needed) from Admin → API Keys. Twilio
/// is one option among several Indian BSPs (Gupshup, Interakt, MSG91); the
/// SendBill method is where you'd swap providers.
/// </summary>
public class NotificationService : INotificationService
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<NotificationService> _log;
    private readonly ISettingsService _settings;

    public NotificationService(IHttpClientFactory httpFactory,
        ILogger<NotificationService> log, ISettingsService settings)
    {
        _httpFactory = httpFactory; _log = log; _settings = settings;
    }

    public async Task<string> SendBillAsync(OrderViewDto order, bool preferWhatsApp)
    {
        var message = await BuildBillText(order);
        var sid = await _settings.GetOrConfigAsync(SettingKeys.TwilioAccountSid, "Notifications:Twilio:AccountSid");
        var token = await _settings.GetOrConfigAsync(SettingKeys.TwilioAuthToken, "Notifications:Twilio:AuthToken");

        if (string.IsNullOrWhiteSpace(sid) || string.IsNullOrWhiteSpace(token))
        {
            _log.LogInformation("[NOTIFY -> {Phone}]\n{Message}", order.CustomerPhone, message);
            return "logged (add Twilio keys under Admin → API Keys to deliver for real)";
        }

        // Try WhatsApp first, then fall back to SMS if it fails.
        if (preferWhatsApp)
        {
            try { return await SendViaTwilio(sid, token, order.CustomerPhone, message, asWhatsApp: true); }
            catch (Exception ex) { _log.LogWarning(ex, "WhatsApp failed, falling back to SMS"); }
        }
        return await SendViaTwilio(sid, token, order.CustomerPhone, message, asWhatsApp: false);
    }

    private async Task<string> SendViaTwilio(string sid, string token, string toPhone, string body, bool asWhatsApp)
    {
        var from = asWhatsApp
            ? await _settings.GetOrConfigAsync(SettingKeys.TwilioWhatsAppFrom, "Notifications:Twilio:WhatsAppFrom")
            : await _settings.GetOrConfigAsync(SettingKeys.TwilioSmsFrom, "Notifications:Twilio:SmsFrom");
        var to = asWhatsApp ? $"whatsapp:{Normalize(toPhone)}" : Normalize(toPhone);

        var client = _httpFactory.CreateClient();
        var basic = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{sid}:{token}"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", basic);

        var form = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["From"] = from, ["To"] = to, ["Body"] = body
        });

        var url = $"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json";
        var resp = await client.PostAsync(url, form);
        var respBody = await resp.Content.ReadAsStringAsync();
        if (!resp.IsSuccessStatusCode)
            throw new InvalidOperationException($"Twilio error ({(int)resp.StatusCode}): {respBody}");

        return asWhatsApp ? "sent via WhatsApp" : "sent via SMS";
    }

    // Assumes Indian numbers; adjust country code handling as needed.
    private static string Normalize(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.Length == 10) return "+91" + digits;
        if (digits.StartsWith("91") && digits.Length == 12) return "+" + digits;
        return phone.StartsWith("+") ? phone : "+" + digits;
    }

    private async Task<string> BuildBillText(OrderViewDto o)
    {
        var projectName = await _settings.GetAsync(SettingKeys.ProjectName) ?? "Fresh & Fold";
        var sb = new StringBuilder();
        sb.AppendLine($"*{projectName} Dry Cleaners*");
        sb.AppendLine($"Bill: {o.OrderNumber}");
        sb.AppendLine($"Customer: {o.CustomerName}");
        sb.AppendLine("--------------------------------");
        foreach (var i in o.Items)
            sb.AppendLine($"{i.Name} x{i.Quantity}  Rs.{i.LineTotal:0.##}");
        sb.AppendLine("--------------------------------");
        sb.AppendLine($"Subtotal: Rs.{o.SubTotal:0.##}");
        sb.AppendLine($"Tax: Rs.{o.TaxAmount:0.##}");
        sb.AppendLine($"*Total: Rs.{o.Total:0.##}*");
        sb.AppendLine($"Payment: {o.PaymentStatus}");
        sb.AppendLine("Thank you for your order!");
        return sb.ToString();
    }
}
