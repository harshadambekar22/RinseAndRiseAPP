using System.Linq;
using RinseRise.Api.Data;
using RinseRise.Api.Dtos;
using RinseRise.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace RinseRise.Api.Controllers;

[ApiController]
[Route("api/admin/categories")]
[Authorize(Roles = "Admin")]
public class AdminCategoriesController : ControllerBase
{
    private readonly AppDbContext _db;
    public AdminCategoriesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> All()
    {
        var cats = await _db.Categories.OrderBy(c => c.SortOrder).ToListAsync();
        var counts = await _db.ClothTypes.GroupBy(c => c.CategoryId)
            .Select(g => new { g.Key, Count = g.Count() }).ToListAsync();
        var map = counts.ToDictionary(x => x.Key, x => x.Count);
        return Ok(cats.Select(c => new CategoryDto(
            c.Id, c.Name, c.Slug, c.Icon, c.ImageUrl, c.SortOrder,
            map.TryGetValue(c.Id, out var n) ? n : 0)));
    }

    [HttpPost]
    public async Task<IActionResult> Create(CategoryUpsertDto dto)
    {
        var c = new Category();
        Apply(c, dto);
        _db.Categories.Add(c);
        await _db.SaveChangesAsync();
        return Ok(new CategoryDto(c.Id, c.Name, c.Slug, c.Icon, c.ImageUrl, c.SortOrder, 0));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, CategoryUpsertDto dto)
    {
        var c = await _db.Categories.FindAsync(id);
        if (c is null) return NotFound();
        Apply(c, dto);
        await _db.SaveChangesAsync();
        return Ok(new CategoryDto(c.Id, c.Name, c.Slug, c.Icon, c.ImageUrl, c.SortOrder, 0));
    }

    private static void Apply(Category c, CategoryUpsertDto d)
    {
        c.Name = d.Name.Trim();
        c.Slug = string.IsNullOrWhiteSpace(d.Slug) ? Slugify(d.Name) : d.Slug.Trim().ToLowerInvariant();
        c.Icon = string.IsNullOrWhiteSpace(d.Icon) ? "shirt" : d.Icon;
        c.ImageUrl = d.ImageUrl;
        c.SortOrder = d.SortOrder;
        c.IsActive = d.IsActive;
    }

    private static string Slugify(string s)
    {
        var chars = s.ToLowerInvariant().Select(ch => char.IsLetterOrDigit(ch) ? ch : '-').ToArray();
        return new string(chars).Trim('-');
    }
}
