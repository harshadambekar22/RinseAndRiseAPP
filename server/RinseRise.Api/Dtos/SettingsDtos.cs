namespace RinseRise.Api.Dtos;

/// <summary>Non-sensitive settings the storefront can read without auth.</summary>
public record PublicSettingsDto(
    bool PickupSchedulingEnabled,
    bool SendBillEnabled,
    bool PayAtPickupEnabled,
    string BusinessPhone,
    string Headline,
    string ProjectName,
    string ProjectDescription,
    string ProjectIcon,
    string ProjectLogo,
    string ThemePrimaryColor,
    string ThemeAccentColor,
    string ContactEmail,
    string ContactPhone,
    string ContactAddress,
    string ContactMapLink,
    // Public by design (an OAuth client id is not a secret) — safe to ship
    // to the browser so the admin can change it without a frontend rebuild.
    string GoogleClientId);

/// <summary>Admin update; any null field is left unchanged.</summary>
public record UpdateSettingsDto(
    bool? PickupSchedulingEnabled,
    bool? SendBillEnabled,
    bool? PayAtPickupEnabled,
    string? BusinessPhone,
    string? Headline,
    string? ProjectName,
    string? ProjectDescription,
    string? ProjectIcon,
    string? ProjectLogo,
    string? ThemePrimaryColor,
    string? ThemeAccentColor,
    string? ContactEmail,
    string? ContactPhone,
    string? ContactAddress,
    string? ContactMapLink);
