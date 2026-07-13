using DryClean.Api.Data;
using DryClean.Api.Dtos;
using DryClean.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace DryClean.Api.Services;

public interface IOrderService
{
    Task<OrderViewDto> CreateOnlineOrderAsync(int userId, CreateOrderDto dto);
    Task<OrderViewDto> CreateShopOrderAsync(ShopBillingDto dto);
    Task<List<OrderViewDto>> GetForUserAsync(int userId);
    Task<OrderViewDto?> GetByIdAsync(int id);
    Task<OrderViewDto?> UpdateStatusAsync(int id, string status);
    Task<List<OrderViewDto>> GetAllAsync();
}

public class OrderService : IOrderService
{
    // Tune these to your business. GST rate is illustrative only.
    private const decimal TaxRate = 0.18m;
    private const decimal DeliveryFee = 0m;       // free pickup & drop by default
    private const decimal FreeDeliveryAbove = 0m; // not used while DeliveryFee = 0

    private readonly AppDbContext _db;
    private readonly IPricingService _pricing;
    public OrderService(AppDbContext db, IPricingService pricing)
    {
        _db = db;
        _pricing = pricing;
    }

    public async Task<OrderViewDto> CreateOnlineOrderAsync(int userId, CreateOrderDto dto)
    {
        var user = await _db.Users.FindAsync(userId)
                   ?? throw new InvalidOperationException("User not found.");

        var order = await BuildOrderAsync(dto.Items, OrderChannel.Online);
        order.UserId = user.Id;
        order.CustomerName = user.Name;
        order.CustomerPhone = user.Phone ?? string.Empty;
        order.Notes = dto.Notes;
        order.Status = dto.ScheduledPickupAt.HasValue ? OrderStatus.PickupScheduled : OrderStatus.Placed;
        order.ScheduledPickupAt = dto.ScheduledPickupAt;

        if (dto.PickupAddress is { } a)
        {
            order.PickupAddressText = $"{a.Line1}, {a.Line2} {a.City}, {a.State} - {a.Pincode}".Replace("  ", " ");
            order.PickupLatitude = a.Latitude;
            order.PickupLongitude = a.Longitude;

            // Persist the address to the user's saved addresses for next time.
            _db.Addresses.Add(new Address
            {
                UserId = user.Id, Label = a.Label, Line1 = a.Line1, Line2 = a.Line2,
                City = a.City, State = a.State, Pincode = a.Pincode,
                Latitude = a.Latitude, Longitude = a.Longitude
            });
        }

        _db.Orders.Add(order);
        await _db.SaveChangesAsync();
        return ToView(order);
    }

    public async Task<OrderViewDto> CreateShopOrderAsync(ShopBillingDto dto)
    {
        var order = await BuildOrderAsync(dto.Items, OrderChannel.Shop);
        order.CustomerName = dto.CustomerName.Trim();
        order.CustomerPhone = dto.CustomerPhone.Trim();
        order.Notes = dto.Notes;
        // Counter sales are paid on the spot.
        order.PaymentStatus = PaymentStatus.Paid;
        order.Status = OrderStatus.InCleaning;

        _db.Orders.Add(order);
        _db.Payments.Add(new Payment
        {
            Order = order, Provider = "Counter", Amount = order.Total,
            Method = dto.PaymentMethod, Status = PaymentStatus.Paid
        });

        await _db.SaveChangesAsync();
        return ToView(order);
    }

    private async Task<Order> BuildOrderAsync(List<OrderItemInputDto> items, OrderChannel channel)
    {
        var ids = items.Select(i => i.ClothTypeId).Distinct().ToList();
        var catalogue = await _db.ClothTypes.Where(c => ids.Contains(c.Id)).ToDictionaryAsync(c => c.Id);
        var activeOffers = await _pricing.GetActiveOffersAsync();

        var order = new Order { Channel = channel, OrderNumber = await NextOrderNumberAsync() };

        foreach (var input in items)
        {
            if (!catalogue.TryGetValue(input.ClothTypeId, out var ct)) continue;
            // Charge the effective (discounted) price so the bill matches the catalogue.
            var unitPrice = _pricing.Compute(ct, activeOffers).Price;
            order.Items.Add(new OrderItem
            {
                ClothTypeId = ct.Id,
                ClothTypeName = ct.Name,
                UnitPrice = unitPrice,
                Quantity = input.Quantity
            });
        }

        if (order.Items.Count == 0)
            throw new InvalidOperationException("None of the selected items were valid.");

        order.SubTotal = order.Items.Sum(i => i.UnitPrice * i.Quantity);
        order.TaxAmount = Math.Round(order.SubTotal * TaxRate, 2);
        order.DeliveryFee = DeliveryFee;
        order.Total = order.SubTotal + order.TaxAmount + order.DeliveryFee;
        return order;
    }

    private async Task<string> NextOrderNumberAsync()
    {
        var today = DateTime.UtcNow;
        var prefix = $"DC-{today:yyyyMMdd}-";
        var countToday = await _db.Orders.CountAsync(o => o.OrderNumber.StartsWith(prefix));
        return $"{prefix}{(countToday + 1):D4}";
    }

    public async Task<List<OrderViewDto>> GetForUserAsync(int userId) =>
        (await _db.Orders.Include(o => o.Items)
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt).ToListAsync())
            .Select(ToView).ToList();

    public async Task<OrderViewDto?> GetByIdAsync(int id)
    {
        var order = await _db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id);
        return order is null ? null : ToView(order);
    }

    public async Task<OrderViewDto?> UpdateStatusAsync(int id, string status)
    {
        if (!Enum.TryParse<OrderStatus>(status, true, out var parsed))
            throw new InvalidOperationException($"Unknown status '{status}'.");

        var order = await _db.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return null;

        order.Status = parsed;
        order.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ToView(order);
    }

    public async Task<List<OrderViewDto>> GetAllAsync() =>
        (await _db.Orders.Include(o => o.Items)
            .OrderByDescending(o => o.CreatedAt).ToListAsync())
            .Select(ToView).ToList();

    private static OrderViewDto ToView(Order o) => new(
        o.Id, o.OrderNumber, o.CustomerName, o.CustomerPhone,
        o.Channel.ToString(), o.Status.ToString(), o.PaymentStatus.ToString(),
        o.SubTotal, o.TaxAmount, o.DeliveryFee, o.Total,
        o.PickupAddressText, o.ScheduledPickupAt, o.CreatedAt,
        o.Items.Select(i => new OrderItemViewDto(
            i.ClothTypeId, i.ClothTypeName, i.UnitPrice, i.Quantity, i.UnitPrice * i.Quantity)).ToList());
}
