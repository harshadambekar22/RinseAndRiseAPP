using RinseRise.Api.Data;
using RinseRise.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace RinseRise.Api.Services;

/// <summary>The result of applying the best active offer to an item's price.</summary>
public record EffectivePrice(decimal Original, decimal Price, decimal DiscountAmount, string? OfferTitle, int? OfferId);

public interface IPricingService
{
    Task<List<Offer>> GetActiveOffersAsync();
    EffectivePrice Compute(ClothType ct, IReadOnlyCollection<Offer> activeOffers);
    Task<Dictionary<int, EffectivePrice>> GetEffectivePricesAsync(IEnumerable<ClothType> clothTypes);
}

public class PricingService : IPricingService
{
    private readonly AppDbContext _db;
    public PricingService(AppDbContext db) => _db = db;

    public async Task<List<Offer>> GetActiveOffersAsync()
    {
        var now = DateTime.UtcNow;
        return await _db.Offers
            .Where(o => o.IsActive && o.StartsAt <= now && o.EndsAt >= now)
            .ToListAsync();
    }

    /// <summary>Picks the single offer that yields the lowest price for this item.</summary>
    public EffectivePrice Compute(ClothType ct, IReadOnlyCollection<Offer> activeOffers)
    {
        var original = ct.PricePerPiece;
        var best = original;
        Offer? bestOffer = null;

        foreach (var o in activeOffers)
        {
            var applies = o.Target switch
            {
                OfferTarget.AllItems => true,
                OfferTarget.Category => o.CategoryId == ct.CategoryId,
                OfferTarget.ClothType => o.ClothTypeId == ct.Id,
                _ => false
            };
            if (!applies) continue;

            var candidate = o.DiscountType == DiscountType.Percentage
                ? original * (1 - o.DiscountValue / 100m)
                : original - o.DiscountValue;
            candidate = Math.Round(Math.Max(0m, candidate), 2);

            if (candidate < best) { best = candidate; bestOffer = o; }
        }

        return new EffectivePrice(original, best, Math.Round(original - best, 2), bestOffer?.Title, bestOffer?.Id);
    }

    public async Task<Dictionary<int, EffectivePrice>> GetEffectivePricesAsync(IEnumerable<ClothType> clothTypes)
    {
        var offers = await GetActiveOffersAsync();
        return clothTypes.ToDictionary(ct => ct.Id, ct => Compute(ct, offers));
    }
}
