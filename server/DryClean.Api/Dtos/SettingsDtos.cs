namespace DryClean.Api.Dtos;

/// <summary>Non-sensitive settings the storefront can read without auth.</summary>
public record PublicSettingsDto(
    bool PickupSchedulingEnabled,
    string BusinessPhone,
    string Headline,
    string ProjectName,
    string ProjectDescription,
    string ProjectIcon,
    string ThemePrimaryColor,
    string ThemeAccentColor,
    string ContactEmail,
    string ContactPhone,
    string ContactAddress,
    string ContactMapLink,
    // Public by design (Maps keys are restricted by HTTP referrer, and an
    // OAuth client id is not a secret) — safe to ship to the browser so the
    // admin can change them without a frontend rebuild.
    string GoogleMapsApiKey,
    string GoogleClientId);

/// <summary>Admin update; any null field is left unchanged.</summary>
public record UpdateSettingsDto(
    bool? PickupSchedulingEnabled,
    string? BusinessPhone,
    string? Headline,
    string? ProjectName,
    string? ProjectDescription,
    string? ProjectIcon,
    string? ThemePrimaryColor,
    string? ThemeAccentColor,
    string? ContactEmail,
    string? ContactPhone,
    string? ContactAddress,
    string? ContactMapLink);
