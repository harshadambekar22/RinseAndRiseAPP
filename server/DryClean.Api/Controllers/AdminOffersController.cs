using DryClean.Api.Dtos;
using DryClean.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DryClean.Api.Controllers;

[ApiController]
[Route("api/admin/offers")]
[Authorize(Roles = "Admin")]
public class AdminOffersController : ControllerBase
{
    private readonly IOfferService _offers;
    public AdminOffersController(IOfferService offers) => _offers = offers;

    [HttpGet]
    public async Task<IActionResult> All() => Ok(await _offers.GetAllAsync());

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id)
        => (await _offers.GetAsync(id)) is { } o ? Ok(o) : NotFound();

    [HttpPost]
    public async Task<IActionResult> Create(OfferUpsertDto dto) => Ok(await _offers.CreateAsync(dto));

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, OfferUpsertDto dto)
        => (await _offers.UpdateAsync(id, dto)) is { } o ? Ok(o) : NotFound();

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
        => await _offers.DeleteAsync(id) ? NoContent() : NotFound();
}
