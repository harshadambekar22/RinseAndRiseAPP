namespace DryClean.Api.Dtos;

/// <summary>One set of API key fields. Used two ways in <see cref="ApiKeysResponseDto"/>:
/// the raw Settings-table override (blank if not set — this is what the admin
/// form edits) and, separately, the effective appsettings.json/env fallback
/// (shown as a hint, never written back). Secrets included — never expose
/// this DTO outside an Admin-authorized route.</summary>
public record ApiKeysDto(
    string GoogleMapsApiKey,
    string GoogleClientId,
    string RazorpayKeyId,
    string RazorpayKeySecret,
    string TwilioAccountSid,
    string TwilioAuthToken,
    string TwilioWhatsAppFrom,
    string TwilioSmsFrom,
    string SmtpHost,
    string SmtpPort,
    string SmtpUsername,
    string SmtpPassword,
    string SmtpFromEmail,
    string SmtpFromName);

/// <summary>GET response: <c>Values</c> is what's actually stored (edit this),
/// <c>Defaults</c> is what's currently in effect from appsettings.json/env when
/// a Values field is blank (display only — saving never writes these back).</summary>
public record ApiKeysResponseDto(ApiKeysDto Values, ApiKeysDto Defaults);

/// <summary>Admin update; any null field is left unchanged. Send an empty
/// string to clear an override and fall back to appsettings.json/env again.</summary>
public record UpdateApiKeysDto(
    string? GoogleMapsApiKey,
    string? GoogleClientId,
    string? RazorpayKeyId,
    string? RazorpayKeySecret,
    string? TwilioAccountSid,
    string? TwilioAuthToken,
    string? TwilioWhatsAppFrom,
    string? TwilioSmsFrom,
    string? SmtpHost,
    string? SmtpPort,
    string? SmtpUsername,
    string? SmtpPassword,
    string? SmtpFromEmail,
    string? SmtpFromName);
