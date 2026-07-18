using RinseRise.Api.Data;
using RinseRise.Api.Dtos;
using RinseRise.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace RinseRise.Api.Services;

public interface IOfferService
{
    Task<List<OfferDto>> GetAllAsync();
    Task<OfferDto?> GetAsync(int id);
    Task<OfferDto> CreateAsync(OfferUpsertDto dto);
    Task<OfferDto?> UpdateAsync(int id, OfferUpsertDto dto);
    Task<bool> DeleteAsync(int id);
}

public class OfferService : IOfferService
{
    private readonly AppDbContext _db;
    public OfferService(AppDbContext db) => _db = db;

    public async Task<List<OfferDto>> GetAllAsync() =>
        (await _db.Offers.Include(o => o.Category).Include(o => o.ClothType)
            .OrderByDescending(o => o.CreatedAt).ToListAsync())
            .Select(ToDto).ToList();

    public async Task<OfferDto?> GetAsync(int id)
    {
        var o = await _db.Offers.Include(x => x.Category).Include(x => x.ClothType)
            .FirstOrDefaultAsync(x => x.Id == id);
        return o is null ? null : ToDto(o);
    }

    public async Task<OfferDto> CreateAsync(OfferUpsertDto dto)
    {
        var o = new Offer { CreatedAt = DateTime.UtcNow };
        Apply(o, dto);
        _db.Offers.Add(o);
        await _db.SaveChangesAsync();
        return (await GetAsync(o.Id))!;
    }

    public async Task<OfferDto?> UpdateAsync(int id, OfferUpsertDto dto)
    {
        var o = await _db.Offers.FindAsync(id);
        if (o is null) return null;
        Apply(o, dto);
        await _db.SaveChangesAsync();
        return await GetAsync(o.Id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var o = await _db.Offers.FindAsync(id);
        if (o is null) return false;
        _db.Offers.Remove(o);
        await _db.SaveChangesAsync();
        return true;
    }

    private static void Apply(Offer o, OfferUpsertDto d)
    {
        o.Title = d.Title.Trim();
        o.Description = d.Description;
        o.DiscountType = Enum.TryParse<DiscountType>(d.DiscountType, true, out var dt) ? dt : DiscountType.Percentage;
        o.DiscountValue = d.DiscountValue;
        o.Target = Enum.TryParse<OfferTarget>(d.Target, true, out var tg) ? tg : OfferTarget.AllItems;
        o.CategoryId = o.Target == OfferTarget.Category ? d.CategoryId : null;
        o.ClothTypeId = o.Target == OfferTarget.ClothType ? d.ClothTypeId : null;
        o.Code = d.Code;
        o.StartsAt = d.StartsAt;
        o.EndsAt = d.EndsAt;
        o.IsActive = d.IsActive;
        o.ShowOnHome = d.ShowOnHome;
        o.BannerImageUrl = d.BannerImageUrl;
    }

    public static OfferDto ToDto(Offer o)
    {
        var now = DateTime.UtcNow;
        var current = o.IsActive && o.StartsAt <= now && o.EndsAt >= now;
        return new OfferDto(
            o.Id, o.Title, o.Description, o.DiscountType.ToString(), o.DiscountValue,
            o.Target.ToString(), o.CategoryId, o.Category?.Name, o.ClothTypeId, o.ClothType?.Name,
            o.Code, o.StartsAt, o.EndsAt, o.IsActive, o.ShowOnHome, o.BannerImageUrl, current);
    }
}
