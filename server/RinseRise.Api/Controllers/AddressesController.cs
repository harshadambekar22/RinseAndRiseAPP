using System.Security.Claims;
using RinseRise.Api.Dtos;
using RinseRise.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace RinseRise.Api.Controllers;

/// <summary>The signed-in customer's saved pickup addresses.</summary>
[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AddressesController : ControllerBase
{
    private readonly IAddressService _addresses;
    public AddressesController(IAddressService addresses) => _addresses = addresses;

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<List<AddressDto>>> Mine() =>
        Ok(await _addresses.GetForUserAsync(CurrentUserId));

    [HttpPost]
    public async Task<ActionResult<AddressDto>> Create(AddressUpsertDto dto) =>
        Ok(await _addresses.CreateAsync(CurrentUserId, dto));

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id) =>
        await _addresses.DeleteAsync(CurrentUserId, id) ? NoContent() : NotFound();
}
