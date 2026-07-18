using System.ComponentModel.DataAnnotations;

namespace DryClean.Api.Models;

/// <summary>A simple key/value store for admin-controlled feature flags,
/// e.g. whether customers may schedule their own pickups.</summary>
public class Setting
{
    [Key, MaxLength(80)]
    public string Key { get; set; } = string.Empty;

    [MaxLength(400)]
    public string Value { get; set; } = string.Empty;
}

/// <summary>Well-known setting keys.</summary>
public static class SettingKeys
{
    public const string PickupSchedulingEnabled = "PickupSchedulingEnabled";
    public const string BusinessPhone = "BusinessPhone";
    public const string HomeHeadline = "HomeHeadline";

    // Branding — shown in the navbar, footer, browser tab, and outgoing bill
    // messages. Changing these updates them everywhere immediately (no rebuild).
    public const string ProjectName = "ProjectName";
    public const string ProjectDescription = "ProjectDescription";
    public const string ProjectIcon = "ProjectIcon";
    public const string ProjectLogo = "ProjectLogo";

    // Theme — base hex colors the storefront derives its whole palette from
    // (buttons, navbar, links, icons). Changing these updates them everywhere
    // immediately (no rebuild).
    public const string ThemePrimaryColor = "ThemePrimaryColor";
    public const string ThemeAccentColor = "ThemeAccentColor";

    // Contact us — shown in the footer. BusinessPhone (above) doubles as the
    // "call to book" number; these are the rest of the contact card.
    public const string ContactEmail = "ContactEmail";
    public const string ContactPhone = "ContactPhone";
    public const string ContactAddress = "ContactAddress";
    public const string ContactMapLink = "ContactMapLink";

    // Third-party API keys, editable from Admin → API Keys instead of
    // appsettings.json so they can change without a redeploy. Empty means
    // "not set here" — services fall back to appsettings.json/env config.
    public const string GoogleClientId = "GoogleClientId";
    public const string RazorpayKeyId = "RazorpayKeyId";
    public const string RazorpayKeySecret = "RazorpayKeySecret";
    public const string TwilioAccountSid = "TwilioAccountSid";
    public const string TwilioAuthToken = "TwilioAuthToken";
    public const string TwilioWhatsAppFrom = "TwilioWhatsAppFrom";
    public const string TwilioSmsFrom = "TwilioSmsFrom";
    public const string SmtpHost = "SmtpHost";
    public const string SmtpPort = "SmtpPort";
    public const string SmtpUsername = "SmtpUsername";
    public const string SmtpPassword = "SmtpPassword";
    public const string SmtpFromEmail = "SmtpFromEmail";
    public const string SmtpFromName = "SmtpFromName";
}
