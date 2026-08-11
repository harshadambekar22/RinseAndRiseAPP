using RinseRise.Api.Data;
using RinseRise.Api.Dtos;
using RinseRise.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace RinseRise.Api.Services;

public interface IAddressService
{
    Task<List<AddressDto>> GetForUserAsync(int userId);
    Task<AddressDto> CreateAsync(int userId, AddressUpsertDto dto);
    Task<bool> DeleteAsync(int userId, int id);
}

public class AddressService : IAddressService
{
    private readonly AppDbContext _db;
    public AddressService(AppDbContext db) => _db = db;

    public async Task<List<AddressDto>> GetForUserAsync(int userId) =>
        (await _db.Addresses.Where(a => a.UserId == userId)
            .OrderByDescending(a => a.Id).ToListAsync())
            .Select(ToDto).ToList();

    public async Task<AddressDto> CreateAsync(int userId, AddressUpsertDto dto)
    {
        var a = new Address
        {
            UserId = userId,
            Label = dto.Label.Trim(),
            Line1 = dto.Line1.Trim(),
            Line2 = dto.Line2,
            City = dto.City,
            State = dto.State,
            Pincode = dto.Pincode,
            Latitude = dto.Latitude,
            Longitude = dto.Longitude,
        };
        _db.Addresses.Add(a);
        await _db.SaveChangesAsync();
        return ToDto(a);
    }

    public async Task<bool> DeleteAsync(int userId, int id)
    {
        var a = await _db.Addresses.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId);
        if (a is null) return false;
        _db.Addresses.Remove(a);
        await _db.SaveChangesAsync();
        return true;
    }

    private static AddressDto ToDto(Address a) => new(
        a.Id, a.Label, a.Line1, a.Line2, a.City, a.State, a.Pincode, a.Latitude, a.Longitude);
}
