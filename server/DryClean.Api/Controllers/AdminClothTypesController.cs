using DryClean.Api.Data;
using DryClean.Api.Dtos;
using DryClean.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DryClean.Api.Controllers;

/// <summary>Admin CRUD for catalogue items (name, type, category, price) — what
/// customers see and price on the storefront's "Book a pickup" flow.</summary>
[ApiController]
[Route("api/admin/clothtypes")]
[Authorize(Roles = "Admin")]
public class AdminClothTypesController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminClothTypesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> All()
    {
        var items = await _db.ClothTypes.Include(c => c.Category)
            .OrderBy(c => c.CategoryId).ThenBy(c => c.Name).ToListAsync();
        return Ok(items.Select(c => ToDto(c, c.Category?.Name ?? "")));
    }

    [HttpPost]
    public async Task<IActionResult> Create(ClothTypeUpsertDto dto)
    {
        var category = await _db.Categories.FindAsync(dto.CategoryId);
        if (category is null) return BadRequest("Category not found.");
        if (dto.PricePerPiece < 0) return BadRequest("Price cannot be negative.");

        var c = new ClothType();
        Apply(c, dto);
        _db.ClothTypes.Add(c);
        await _db.SaveChangesAsync();
        return Ok(ToDto(c, category.Name));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, ClothTypeUpsertDto dto)
    {
        var c = await _db.ClothTypes.FindAsync(id);
        if (c is null) return NotFound();
        var category = await _db.Categories.FindAsync(dto.CategoryId);
        if (category is null) return BadRequest("Category not found.");
        if (dto.PricePerPiece < 0) return BadRequest("Price cannot be negative.");

        Apply(c, dto);
        await _db.SaveChangesAsync();
        return Ok(ToDto(c, category.Name));
    }

    private static void Apply(ClothType c, ClothTypeUpsertDto d)
    {
        c.Name = d.Name.Trim();
        c.CategoryId = d.CategoryId;
        c.Service = Enum.TryParse<ServiceType>(d.Service, true, out var svc) ? svc : ServiceType.DryClean;
        c.PricePerPiece = d.PricePerPiece;
        c.Icon = string.IsNullOrWhiteSpace(d.Icon) ? "shirt" : d.Icon;
        c.IsActive = d.IsActive;
    }

    private static ClothTypeAdminDto ToDto(ClothType c, string categoryName) => new(
        c.Id, c.Name, c.Service.ToString(), c.CategoryId, categoryName, c.PricePerPiece, c.Icon, c.IsActive);
}
