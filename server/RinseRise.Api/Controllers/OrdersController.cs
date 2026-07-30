using System.Security.Claims;
using RinseRise.Api.Dtos;
using RinseRise.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace RinseRise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orders;
    public OrdersController(IOrderService orders) => _orders = orders;

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>Place an order as a signed-in customer.</summary>
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<OrderViewDto>> Create(CreateOrderDto dto)
    {
        try { return Ok(await _orders.CreateOnlineOrderAsync(CurrentUserId, dto)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>The signed-in customer's own order history.</summary>
    [Authorize]
    [HttpGet("mine")]
    public async Task<ActionResult<List<OrderViewDto>>> Mine() =>
        Ok(await _orders.GetForUserAsync(CurrentUserId));

    /// <summary>Live tracking / invoice detail for a single order. Only the
    /// order's own customer or an admin may view it.</summary>
    [Authorize]
    [HttpGet("{id:int}")]
    public async Task<ActionResult<OrderViewDto>> GetOne(int id)
    {
        var order = await _orders.GetByIdAsync(id);
        if (order is null) return NotFound();
        if (!User.IsInRole("Admin") && !await _orders.IsOwnedByAsync(id, CurrentUserId)) return Forbid();
        return Ok(order);
    }

    /// <summary>Admin advances the order through its lifecycle.</summary>
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:int}/status")]
    public async Task<ActionResult<OrderViewDto>> UpdateStatus(int id, UpdateStatusDto dto)
    {
        try
        {
            var updated = await _orders.UpdateStatusAsync(id, dto.Status);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>The customer cancels their own order — only while it's still
    /// waiting for pickup (status "PickupScheduled").</summary>
    [Authorize]
    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<OrderViewDto>> Cancel(int id)
    {
        if (!User.IsInRole("Admin") && !await _orders.IsOwnedByAsync(id, CurrentUserId)) return Forbid();
        try
        {
            var updated = await _orders.CancelAsync(id);
            return updated is null ? NotFound() : Ok(updated);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
