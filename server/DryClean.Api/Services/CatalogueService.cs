using DryClean.Api.Data;
using DryClean.Api.Dtos;
using Microsoft.EntityFrameworkCore;

namespace DryClean.Api.Services;

public interface ICatalogueService
{
    Task<List<CategoryDto>> GetCategoriesAsync();
    Task<List<ClothTypeDto>> GetClothTypesAsync(string? categorySlug = null);
    Task<List<ProcessStepDto>> GetProcessStepsAsync();
    Task<HomeDto> GetHomeAsync();
}

public class CatalogueService : ICatalogueService
{
    private readonly AppDbContext _db;
    private readonly IPricingService _pricing;
    private readonly ISettingsService _settings;

    public CatalogueService(AppDbContext db, IPricingService pricing, ISettingsService settings)
    { _db = db; _pricing = pricing; _settings = settings; }

    public async Task<List<CategoryDto>> GetCategoriesAsync()
    {
        var cats = await _db.Categories.Where(c => c.IsActive).OrderBy(c => c.SortOrder).ToListAsync();
        var counts = await _db.ClothTypes.Where(c => c.IsActive)
            .GroupBy(c => c.CategoryId).Select(g => new { g.Key, Count = g.Count() }).ToListAsync();
        var map = counts.ToDictionary(x => x.Key, x => x.Count);
        return cats.Select(c => new CategoryDto(
            c.Id, c.Name, c.Slug, c.Icon, c.ImageUrl, c.SortOrder,
            map.TryGetValue(c.Id, out var n) ? n : 0)).ToList();
    }

    public async Task<List<ClothTypeDto>> GetClothTypesAsync(string? categorySlug = null)
    {
        var q = _db.ClothTypes.Include(c => c.Category).Where(c => c.IsActive);
        if (!string.IsNullOrWhiteSpace(categorySlug))
            q = q.Where(c => c.Category!.Slug == categorySlug);

        var items = await q.OrderBy(c => c.CategoryId).ThenBy(c => c.Id).ToListAsync();
        var offers = await _pricing.GetActiveOffersAsync();

        return items.Select(c =>
        {
            var p = _pricing.Compute(c, offers);
            return new ClothTypeDto(
                c.Id, c.Name, c.Description, c.Overview, c.Service.ToString(),
                c.CategoryId, c.Category?.Name ?? "", c.Category?.Slug ?? "",
                c.PricePerPiece, p.Price, p.DiscountAmount, p.OfferTitle, c.Icon);
        }).ToList();
    }

    public async Task<List<ProcessStepDto>> GetProcessStepsAsync() =>
        (await _db.ProcessSteps.Where(s => s.IsActive).OrderBy(s => s.StepNumber).ToListAsync())
            .Select(s => new ProcessStepDto(s.StepNumber, s.Title, s.Description, s.Icon)).ToList();

    public async Task<HomeDto> GetHomeAsync()
    {
        var pub = await _settings.GetPublicAsync();
        var now = DateTime.UtcNow;

        var homeOffers = (await _db.Offers.Include(o => o.Category).Include(o => o.ClothType)
            .Where(o => o.IsActive && o.ShowOnHome && o.StartsAt <= now && o.EndsAt >= now)
            .OrderByDescending(o => o.CreatedAt).ToListAsync())
            .Select(OfferService.ToDto).ToList();

        var categories = await GetCategoriesAsync();
        var steps = await GetProcessStepsAsync();

        var all = await GetClothTypesAsync();
        var featured = all.Where(c => c.DiscountAmount > 0).Take(8).ToList();

        return new HomeDto(pub.Headline, pub.BusinessPhone, pub.PickupSchedulingEnabled,
            homeOffers, categories, steps, featured);
    }
}
