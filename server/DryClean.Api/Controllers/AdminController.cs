using DryClean.Api.Data;
using DryClean.Api.Dtos;
using DryClean.Api.Models;
using DryClean.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DryClean.Api.Controllers;

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

    /// <summary>All registered customers and their order counts.</summary>
    [HttpGet("users")]
    public async Task<ActionResult<List<UserViewDto>>> Users()
    {
        var users = await _db.Users
            .Select(u => new UserViewDto(
                u.Id, u.Name, u.Email, u.Phone, u.Role.ToString(), u.CreatedAt,
                _db.Orders.Count(o => o.UserId == u.Id)))
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();
        return Ok(users);
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
