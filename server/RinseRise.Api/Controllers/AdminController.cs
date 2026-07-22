using System.Security.Claims;
using RinseRise.Api.Data;
using RinseRise.Api.Dtos;
using RinseRise.Api.Models;
using RinseRise.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace RinseRise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IOrderService _orders;
    private readonly INotificationService _notify;

    public AdminController(AppDbContext db, IOrderService orders, INotificationService notify)
    {
        _db = db; _orders = orders; _notify = notify;
    }

    /// <summary>Top-of-dashboard summary cards.</summary>
    [HttpGet("summary")]
    public async Task<ActionResult<DashboardSummaryDto>> Summary()
    {
        var startOfDay = DateTime.UtcNow.Date;
        var orders = _db.Orders;

        // SQLite has no native decimal type, and EF Core's Sqlite provider can't
        // translate SumAsync() over a decimal column server-side — pull the paid
        // totals down and sum them client-side instead.
        var paidTotals = await orders.Where(o => o.PaymentStatus == PaymentStatus.Paid)
            .Select(o => new { o.Total, o.CreatedAt }).ToListAsync();

        var summary = new DashboardSummaryDto(
            TotalOrders: await orders.CountAsync(),
            OrdersToday: await orders.CountAsync(o => o.CreatedAt >= startOfDay),
            RevenueTotal: paidTotals.Sum(o => o.Total),
            RevenueToday: paidTotals.Where(o => o.CreatedAt >= startOfDay).Sum(o => o.Total),
            PendingPickups: await orders.CountAsync(o => o.Status == OrderStatus.Placed || o.Status == OrderStatus.PickupScheduled),
            InCleaning: await orders.CountAsync(o => o.Status == OrderStatus.InCleaning),
            CustomerCount: await _db.Users.CountAsync(u => u.Role == UserRole.Customer));

        return Ok(summary);
    }

    /// <summary>Every billing transaction, newest first.</summary>
    [HttpGet("transactions")]
    public async Task<ActionResult<List<OrderViewDto>>> Transactions() =>
        Ok(await _orders.GetAllAsync());

    /// <summary>All orders for the Orders management grid (sort/filter/status update
    /// happen client-side; status changes go through PUT /orders/{id}/status).</summary>
    [HttpGet("orders")]
    public async Task<ActionResult<List<OrderViewDto>>> Orders() =>
        Ok(await _orders.GetAllAsync());

    /// <summary>Invoice search by order number, mobile number, or account email.</summary>
    [HttpGet("invoices/search")]
    public async Task<ActionResult<List<OrderViewDto>>> SearchInvoices([FromQuery] string q) =>
        Ok(await _orders.SearchAsync(q));

    /// <summary>All registered customers and their order counts.</summary>
    [HttpGet("users")]
    public async Task<ActionResult<List<UserViewDto>>> Users()
    {
        // Enum.ToString() inside a server-side projection can't be translated by the
        // Sqlite provider, so keep the projection to plain columns and build the DTO
        // (with its ToString() call) client-side after materializing.
        var users = await _db.Users
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new
            {
                u.Id, u.Name, u.Email, u.Phone, u.Role, u.CreatedAt,
                OrderCount = _db.Orders.Count(o => o.UserId == u.Id)
            })
            .ToListAsync();

        return Ok(users.Select(u => new UserViewDto(
            u.Id, u.Name, u.Email, u.Phone, u.Role.ToString(), u.CreatedAt, u.OrderCount)).ToList());
    }

    /// <summary>Promote a customer to Admin, giving them full dashboard access.</summary>
    [HttpPost("users/{id:int}/make-admin")]
    public async Task<ActionResult<UserViewDto>> MakeAdmin(int id)
    {
        var user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound();

        user.Role = UserRole.Admin;
        await _db.SaveChangesAsync();

        var orderCount = await _db.Orders.CountAsync(o => o.UserId == user.Id);
        return Ok(new UserViewDto(user.Id, user.Name, user.Email, user.Phone, user.Role.ToString(), user.CreatedAt, orderCount));
    }

    /// <summary>Delete a customer account. Blocked for the caller's own account, and for
    /// anyone with order history (deleting them would orphan or destroy billing records).</summary>
    [HttpDelete("users/{id:int}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (id == currentUserId)
            return BadRequest(new { message = "You can't delete your own account." });

        var user = await _db.Users.FindAsync(id);
        if (user is null) return NotFound();

        if (await _db.Orders.AnyAsync(o => o.UserId == id))
            return BadRequest(new { message = "This customer has order history and can't be deleted." });

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    /// <summary>Counter billing: build an invoice for a walk-in customer,
    /// take payment, and push the bill to WhatsApp (SMS fallback).</summary>
    [HttpPost("shop-billing")]
    public async Task<IActionResult> ShopBilling(ShopBillingDto dto)
    {
        try
        {
            var order = await _orders.CreateShopOrderAsync(dto);
            var delivery = await _notify.SendBillAsync(order, preferWhatsApp: dto.SendWhatsApp);
            return Ok(new { order, notification = delivery });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Re-send the bill for any order (e.g. customer didn't receive it).</summary>
    [HttpPost("orders/{id:int}/send-bill")]
    public async Task<IActionResult> ResendBill(int id, [FromQuery] bool whatsapp = true)
    {
        var order = await _orders.GetByIdAsync(id);
        if (order is null) return NotFound();
        var delivery = await _notify.SendBillAsync(order, preferWhatsApp: whatsapp);
        return Ok(new { notification = delivery });
    }
}
