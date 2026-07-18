using DryClean.Api.Data;
using DryClean.Api.Dtos;
using DryClean.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DryClean.Api.Services;

public interface ISettingsService
{
    Task<string?> GetAsync(string key);
    Task<bool> GetBoolAsync(string key, bool fallback = false);
    Task SetAsync(string key, string value);
    Task<PublicSettingsDto> GetPublicAsync();

    /// <summary>An admin-editable API key: the Settings table value wins if set,
    /// otherwise falls back to appsettings.json/env config at <paramref name="configPath"/>
    /// (e.g. "Razorpay:KeyId"). Unfilled appsettings.json placeholders
    /// ("YOUR_...") are treated as not configured.</summary>
    Task<string> GetOrConfigAsync(string settingKey, string configPath);
}

public class SettingsService : ISettingsService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _config;
    public SettingsService(AppDbContext db, IConfiguration config) { _db = db; _config = config; }

    public async Task<string?> GetAsync(string key) =>
        (await _db.Settings.FindAsync(key))?.Value;

    public async Task<bool> GetBoolAsync(string key, bool fallback = false)
    {
        var v = await GetAsync(key);
        return v is null ? fallback : v.Equals("true", StringComparison.OrdinalIgnoreCase);
    }

    public async Task SetAsync(string key, string value)
    {
        var row = await _db.Settings.FindAsync(key);
        if (row is null) _db.Settings.Add(new Setting { Key = key, Value = value });
        else row.Value = value;
        await _db.SaveChangesAsync();
    }

    public async Task<string> GetOrConfigAsync(string settingKey, string configPath)
    {
        var db = await GetAsync(settingKey);
        if (!string.IsNullOrWhiteSpace(db)) return db;
        var fallback = _config[configPath] ?? string.Empty;
        return IsPlaceholder(fallback) ? string.Empty : fallback;
    }

    // appsettings.json's unfilled template values ("rzp_test_YOUR_KEY_ID",
    // "+1XXXXXXXXXX") shouldn't be reported as if they were real keys.
    private static bool IsPlaceholder(string value) =>
        value.Contains("YOUR_", StringComparison.Ordinal) || value.Contains("XXXXXXX", StringComparison.Ordinal);

    public async Task<PublicSettingsDto> GetPublicAsync() => new(
        await GetBoolAsync(SettingKeys.PickupSchedulingEnabled),
        await GetAsync(SettingKeys.BusinessPhone) ?? string.Empty,
        await GetAsync(SettingKeys.HomeHeadline) ?? "Fresh clothes, without the trip.",
        await GetAsync(SettingKeys.ProjectName) ?? "Fresh & Fold",
        await GetAsync(SettingKeys.ProjectDescription) ?? "Pickup & delivery dry cleaning, without the trip.",
        await GetAsync(SettingKeys.ProjectIcon) ?? "shirt",
        await GetAsync(SettingKeys.ProjectLogo) ?? string.Empty,
        await GetAsync(SettingKeys.ThemePrimaryColor) ?? "#e8590c",
        await GetAsync(SettingKeys.ThemeAccentColor) ?? "#f59e0b",
        await GetAsync(SettingKeys.ContactEmail) ?? string.Empty,
        await GetAsync(SettingKeys.ContactPhone) ?? string.Empty,
        await GetAsync(SettingKeys.ContactAddress) ?? string.Empty,
        await GetAsync(SettingKeys.ContactMapLink) ?? string.Empty,
        // DB value (set from Admin → API Keys) wins if present; the OAuth
        // client id already lived in appsettings.json, so fall back to that
        // here so a fresh clone with only appsettings still works.
        await GetOrConfigAsync(SettingKeys.GoogleClientId, "Google:ClientId"));
}
