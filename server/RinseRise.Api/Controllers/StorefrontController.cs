using RinseRise.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace RinseRise.Api.Controllers;

/// <summary>Public, unauthenticated endpoints that power the storefront.</summary>
[ApiController]
[Route("api")]
public class StorefrontController : ControllerBase
{
    private readonly ICatalogueService _catalogue;
    private readonly ISettingsService _settings;
    public StorefrontController(ICatalogueService catalogue, ISettingsService settings)
    { _catalogue = catalogue; _settings = settings; }

    [HttpGet("categories")]
    public async Task<IActionResult> Categories() => Ok(await _catalogue.GetCategoriesAsync());

    /// <summary>Catalogue with effective (discounted) prices. Optional ?category=slug filter.</summary>
    [HttpGet("clothtypes")]
    public async Task<IActionResult> ClothTypes([FromQuery] string? category)
        => Ok(await _catalogue.GetClothTypesAsync(category));

    [HttpGet("process-steps")]
    public async Task<IActionResult> ProcessSteps() => Ok(await _catalogue.GetProcessStepsAsync());

    /// <summary>Everything the homepage needs: offers, categories, steps, featured discounts.</summary>
    [HttpGet("home")]
    public async Task<IActionResult> Home() => Ok(await _catalogue.GetHomeAsync());

    [HttpGet("settings/public")]
    public async Task<IActionResult> PublicSettings() => Ok(await _settings.GetPublicAsync());
}
