using System.Text.RegularExpressions;
using DryClean.Api.Dtos;
using DryClean.Api.Models;
using DryClean.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DryClean.Api.Controllers;

[ApiController]
[Route("api/admin/settings")]
[Authorize(Roles = "Admin")]
public class AdminSettingsController : ControllerBase
{
    private static readonly Regex HexColor = new(@"^#[0-9a-fA-F]{6}$", RegexOptions.Compiled);

    private readonly ISettingsService _settings;
    public AdminSettingsController(ISettingsService settings) => _settings = settings;

    [HttpGet]
    public async Task<IActionResult> Get() => Ok(await _settings.GetPublicAsync());

    /// <summary>Update feature flags/content. Null fields are left unchanged.</summary>
    [HttpPut]
    public async Task<IActionResult> Update(UpdateSettingsDto dto)
    {
        if (dto.ThemePrimaryColor is not null && !HexColor.IsMatch(dto.ThemePrimaryColor))
            return BadRequest("ThemePrimaryColor must be a 6-digit hex color, e.g. #e8590c.");
        if (dto.ThemeAccentColor is not null && !HexColor.IsMatch(dto.ThemeAccentColor))
            return BadRequest("ThemeAccentColor must be a 6-digit hex color, e.g. #f59e0b.");

        if (dto.PickupSchedulingEnabled.HasValue)
            await _settings.SetAsync(SettingKeys.PickupSchedulingEnabled, dto.PickupSchedulingEnabled.Value ? "true" : "false");
        if (dto.BusinessPhone is not null)
            await _settings.SetAsync(SettingKeys.BusinessPhone, dto.BusinessPhone);
        if (dto.Headline is not null)
            await _settings.SetAsync(SettingKeys.HomeHeadline, dto.Headline);
        if (dto.ProjectName is not null)
            await _settings.SetAsync(SettingKeys.ProjectName, dto.ProjectName);
        if (dto.ProjectDescription is not null)
            await _settings.SetAsync(SettingKeys.ProjectDescription, dto.ProjectDescription);
        if (dto.ProjectIcon is not null)
            await _settings.SetAsync(SettingKeys.ProjectIcon, dto.ProjectIcon);
        if (dto.ProjectLogo is not null)
            await _settings.SetAsync(SettingKeys.ProjectLogo, dto.ProjectLogo);
        if (dto.ThemePrimaryColor is not null)
            await _settings.SetAsync(SettingKeys.ThemePrimaryColor, dto.ThemePrimaryColor);
        if (dto.ThemeAccentColor is not null)
            await _settings.SetAsync(SettingKeys.ThemeAccentColor, dto.ThemeAccentColor);
        if (dto.ContactEmail is not null)
            await _settings.SetAsync(SettingKeys.ContactEmail, dto.ContactEmail);
        if (dto.ContactPhone is not null)
            await _settings.SetAsync(SettingKeys.ContactPhone, dto.ContactPhone);
        if (dto.ContactAddress is not null)
            await _settings.SetAsync(SettingKeys.ContactAddress, dto.ContactAddress);
        if (dto.ContactMapLink is not null)
            await _settings.SetAsync(SettingKeys.ContactMapLink, dto.ContactMapLink);
        return Ok(await _settings.GetPublicAsync());
    }
}
