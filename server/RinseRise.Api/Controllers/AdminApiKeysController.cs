using RinseRise.Api.Dtos;
using RinseRise.Api.Models;
using RinseRise.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace RinseRise.Api.Controllers;

/// <summary>Admin-only: view/update third-party API keys (Google OAuth,
/// Razorpay, Twilio). These live in the same Settings key/value table
/// as everything else on the Features page, so saving here takes effect
/// immediately (no redeploy) — RazorpayService, AuthService, and
/// NotificationService all check the Settings table first and fall back to
/// appsettings.json/env config if nothing's been saved here yet.</summary>
[ApiController]
[Route("api/admin/apikeys")]
[Authorize(Roles = "Admin")]
public class AdminApiKeysController : ControllerBase
{
    private readonly ISettingsService _settings;
    public AdminApiKeysController(ISettingsService settings) => _settings = settings;

    [HttpGet]
    public async Task<IActionResult> Get() => Ok(await BuildResponse());

    [HttpPut]
    public async Task<IActionResult> Update(UpdateApiKeysDto dto)
    {
        if (dto.GoogleClientId is not null) await _settings.SetAsync(SettingKeys.GoogleClientId, dto.GoogleClientId);
        if (dto.RazorpayKeyId is not null) await _settings.SetAsync(SettingKeys.RazorpayKeyId, dto.RazorpayKeyId);
        if (dto.RazorpayKeySecret is not null) await _settings.SetAsync(SettingKeys.RazorpayKeySecret, dto.RazorpayKeySecret);
        if (dto.TwilioAccountSid is not null) await _settings.SetAsync(SettingKeys.TwilioAccountSid, dto.TwilioAccountSid);
        if (dto.TwilioAuthToken is not null) await _settings.SetAsync(SettingKeys.TwilioAuthToken, dto.TwilioAuthToken);
        if (dto.TwilioWhatsAppFrom is not null) await _settings.SetAsync(SettingKeys.TwilioWhatsAppFrom, dto.TwilioWhatsAppFrom);
        if (dto.TwilioSmsFrom is not null) await _settings.SetAsync(SettingKeys.TwilioSmsFrom, dto.TwilioSmsFrom);
        if (dto.SmtpHost is not null) await _settings.SetAsync(SettingKeys.SmtpHost, dto.SmtpHost);
        if (dto.SmtpPort is not null) await _settings.SetAsync(SettingKeys.SmtpPort, dto.SmtpPort);
        if (dto.SmtpUsername is not null) await _settings.SetAsync(SettingKeys.SmtpUsername, dto.SmtpUsername);
        if (dto.SmtpPassword is not null) await _settings.SetAsync(SettingKeys.SmtpPassword, dto.SmtpPassword);
        if (dto.SmtpFromEmail is not null) await _settings.SetAsync(SettingKeys.SmtpFromEmail, dto.SmtpFromEmail);
        if (dto.SmtpFromName is not null) await _settings.SetAsync(SettingKeys.SmtpFromName, dto.SmtpFromName);
        return Ok(await BuildResponse());
    }

    private async Task<ApiKeysResponseDto> BuildResponse()
    {
        // Raw overrides only — this is what the form edits and saves back.
        // Returning the *resolved* (fallback-included) value here would mean
        // clicking Save with an untouched field silently bakes appsettings'
        // current value into the DB as a permanent override.
        var values = new ApiKeysDto(
            await _settings.GetAsync(SettingKeys.GoogleClientId) ?? string.Empty,
            await _settings.GetAsync(SettingKeys.RazorpayKeyId) ?? string.Empty,
            await _settings.GetAsync(SettingKeys.RazorpayKeySecret) ?? string.Empty,
            await _settings.GetAsync(SettingKeys.TwilioAccountSid) ?? string.Empty,
            await _settings.GetAsync(SettingKeys.TwilioAuthToken) ?? string.Empty,
            await _settings.GetAsync(SettingKeys.TwilioWhatsAppFrom) ?? string.Empty,
            await _settings.GetAsync(SettingKeys.TwilioSmsFrom) ?? string.Empty,
            await _settings.GetAsync(SettingKeys.SmtpHost) ?? string.Empty,
            await _settings.GetAsync(SettingKeys.SmtpPort) ?? string.Empty,
            await _settings.GetAsync(SettingKeys.SmtpUsername) ?? string.Empty,
            await _settings.GetAsync(SettingKeys.SmtpPassword) ?? string.Empty,
            await _settings.GetAsync(SettingKeys.SmtpFromEmail) ?? string.Empty,
            await _settings.GetAsync(SettingKeys.SmtpFromName) ?? string.Empty);

        // What's actually in effect right now (falls back to appsettings.json)
        // — display-only, so the admin can see a key already works via config
        // even though the field above is blank.
        var defaults = new ApiKeysDto(
            await _settings.GetOrConfigAsync(SettingKeys.GoogleClientId, "Google:ClientId"),
            await _settings.GetOrConfigAsync(SettingKeys.RazorpayKeyId, "Razorpay:KeyId"),
            await _settings.GetOrConfigAsync(SettingKeys.RazorpayKeySecret, "Razorpay:KeySecret"),
            await _settings.GetOrConfigAsync(SettingKeys.TwilioAccountSid, "Notifications:Twilio:AccountSid"),
            await _settings.GetOrConfigAsync(SettingKeys.TwilioAuthToken, "Notifications:Twilio:AuthToken"),
            await _settings.GetOrConfigAsync(SettingKeys.TwilioWhatsAppFrom, "Notifications:Twilio:WhatsAppFrom"),
            await _settings.GetOrConfigAsync(SettingKeys.TwilioSmsFrom, "Notifications:Twilio:SmsFrom"),
            await _settings.GetOrConfigAsync(SettingKeys.SmtpHost, "Email:SmtpHost"),
            await _settings.GetOrConfigAsync(SettingKeys.SmtpPort, "Email:SmtpPort"),
            await _settings.GetOrConfigAsync(SettingKeys.SmtpUsername, "Email:SmtpUsername"),
            await _settings.GetOrConfigAsync(SettingKeys.SmtpPassword, "Email:SmtpPassword"),
            await _settings.GetOrConfigAsync(SettingKeys.SmtpFromEmail, "Email:SmtpFromEmail"),
            await _settings.GetOrConfigAsync(SettingKeys.SmtpFromName, "Email:SmtpFromName"));

        return new ApiKeysResponseDto(values, defaults);
    }
}
