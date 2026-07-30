using RinseRise.Api.Data;
using RinseRise.Api.Dtos;
using RinseRise.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace RinseRise.Api.Services;

public interface IOrderService
{
    Task<OrderViewDto> CreateOnlineOrderAsync(int userId, CreateOrderDto dto);
    Task<OrderViewDto> CreateShopOrderAsync(ShopBillingDto dto);
    Task<List<OrderViewDto>> GetForUserAsync(int userId);
    Task<OrderViewDto?> GetByIdAsync(int id);
    Task<OrderViewDto?> UpdateStatusAsync(int id, string status);
    Task<List<OrderViewDto>> GetAllAsync();

    /// <summary>Invoice lookup by order number, phone, or the linked account's email.</summary>
    Task<List<OrderViewDto>> SearchAsync(string query);

    Task<bool> IsOwnedByAsync(int orderId, int userId);

    /// <summary>Sends the WhatsApp/SMS bill for an order if the "Send bill" feature
    /// flag is on and it hasn't already been sent (unless <paramref name="force"/>).
    /// The single place every bill-send call site should go through.</summary>
    Task<string> SendBillIfDueAsync(int orderId, bool preferWhatsApp, bool force = false);

    /// <summary>Admin reconciles a Pending order (e.g. pay-at-pickup) as paid.</summary>
    Task<OrderViewDto?> MarkPaidAsync(int id);

    /// <summary>Customer cancels their own order — only while it's still waiting for pickup.</summary>
    Task<OrderViewDto?> CancelAsync(int id);
}

public class OrderService : IOrderService
{
    // Tune these to your business. GST rate is illustrative only.
    private const decimal TaxRate = 0.18m;
    private const decimal DeliveryFee = 0m;       // free pickup & drop by default
    private const decimal FreeDeliveryAbove = 0m; // not used while DeliveryFee = 0

    private readonly AppDbContext _db;
    private readonly IPricingService _pricing;
    private readonly INotificationService _notify;
    private readonly ISettingsService _settings;
    private readonly ILogger<OrderService> _log;
    public OrderService(AppDbContext db, IPricingService pricing,
        INotificationService notify, ISettingsService settings, ILogger<OrderService> log)
    {
        _db = db;
        _pricing = pricing;
        _notify = notify;
        _settings = settings;
        _log = log;
    }

    public async Task<OrderViewDto> CreateOnlineOrderAsync(int userId, CreateOrderDto dto)
    {
        var user = await _db.Users.FindAsync(userId)
                   ?? throw new InvalidOperationException("User not found.");

        if (dto.ScheduledPickupAt.HasValue && dto.ScheduledPickupAt.Value.Date < DateTime.UtcNow.Date)
            throw new InvalidOperationException("Pickup date can't be in the past.");

        var payAtPickup = string.Equals(dto.PaymentMethod, "PayAtPickup", StringComparison.OrdinalIgnoreCase);
        if (payAtPickup && !await _settings.GetBoolAsync(SettingKeys.PayAtPickupEnabled))
            throw new InvalidOperationException("Pay at pickup is not available right now.");

        var order = await BuildOrderAsync(dto.Items, OrderChannel.Online);
        order.PaymentProvider = payAtPickup ? "PayAtPickup" : "Razorpay";
        order.UserId = user.Id;
        order.CustomerName = user.Name;
        order.CustomerPhone = user.Phone ?? string.Empty;
        order.Notes = dto.Notes;
        order.Status = dto.ScheduledPickupAt.HasValue ? OrderStatus.PickupScheduled : OrderStatus.Placed;
        order.ScheduledPickupAt = dto.ScheduledPickupAt;

        if (dto.AddressId.HasValue)
        {
            // Reusing a saved address — stamp the order from the DB's own
            // copy of it (ownership-checked), not whatever the client also
            // sent in PickupAddress, and don't insert a duplicate row.
            var saved = await _db.Addresses.FirstOrDefaultAsync(x => x.Id == dto.AddressId.Value && x.UserId == user.Id)
                        ?? throw new InvalidOperationException("Address not found.");
            order.PickupAddressText = $"{saved.Line1}, {saved.Line2} {saved.City}, {saved.State} - {saved.Pincode}".Replace("  ", " ");
            order.PickupLatitude = saved.Latitude;
            order.PickupLongitude = saved.Longitude;
        }
        else if (dto.PickupAddress is { } a)
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
        if (payAtPickup)
        {
            _db.Payments.Add(new Payment
            {
                Order = order, Provider = "PayAtPickup", Amount = order.Total,
                Method = "cash", Status = PaymentStatus.Pending
            });
        }
        await _db.SaveChangesAsync();

        if (payAtPickup)
            await SendBillIfDueAsync(order.Id, preferWhatsApp: true);

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
        order.PaymentProvider = "Counter";
        order.Status = OrderStatus.InCleaning;

        // Counter sales have no pickup leg — a walk-in customer already brought
        // the clothes in. "Door delivery" just means the *finished* order goes
        // back out to an address, so it reuses the same pickup-address fields
        // (disambiguated by Channel == Shop) rather than adding parallel columns.
        if (string.Equals(dto.DeliveryMethod, "DoorDelivery", StringComparison.OrdinalIgnoreCase))
        {
            if (dto.DeliveryAddress is not { } a || string.IsNullOrWhiteSpace(a.Line1))
                throw new InvalidOperationException("A delivery address is required for door delivery.");
            order.PickupAddressText = $"{a.Line1}, {a.Line2} {a.City}, {a.State} - {a.Pincode}".Replace("  ", " ");
            order.PickupLatitude = a.Latitude;
            order.PickupLongitude = a.Longitude;
        }

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
            // Charge the effective (discounted) price so the bill matches the catalogue,
            // but keep the original price too so invoices can show what was saved.
            var effective = _pricing.Compute(ct, activeOffers);
            order.Items.Add(new OrderItem
            {
                ClothTypeId = ct.Id,
                ClothTypeName = ct.Name,
                OriginalUnitPrice = effective.Original,
                UnitPrice = effective.Price,
                Quantity = input.Quantity
            });
        }

        if (order.Items.Count == 0)
            throw new InvalidOperationException("None of the selected items were valid.");

        order.SubTotal = order.Items.Sum(i => i.UnitPrice * i.Quantity);
        order.DiscountTotal = order.Items.Sum(i => i.LineDiscount);
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
        (await _db.Orders.Include(o => o.Items).Include(o => o.User)
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt).ToListAsync())
            .Select(ToView).ToList();

    public async Task<OrderViewDto?> GetByIdAsync(int id)
    {
        var order = await _db.Orders.Include(o => o.Items).Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == id);
        return order is null ? null : ToView(order);
    }

    public async Task<OrderViewDto?> UpdateStatusAsync(int id, string status)
    {
        if (!Enum.TryParse<OrderStatus>(status, true, out var parsed))
            throw new InvalidOperationException($"Unknown status '{status}'.");

        var order = await _db.Orders.Include(o => o.Items).Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return null;

        order.Status = parsed;
        order.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ToView(order);
    }

    public async Task<List<OrderViewDto>> GetAllAsync() =>
        (await _db.Orders.Include(o => o.Items).Include(o => o.User)
            .OrderByDescending(o => o.CreatedAt).ToListAsync())
            .Select(ToView).ToList();

    public async Task<List<OrderViewDto>> SearchAsync(string query)
    {
        var q = (query ?? string.Empty).Trim().ToLower();
        if (string.IsNullOrEmpty(q)) return new List<OrderViewDto>();

        var orders = await _db.Orders.Include(o => o.Items).Include(o => o.User)
            .Where(o => o.OrderNumber.ToLower().Contains(q)
                     || o.CustomerPhone.ToLower().Contains(q)
                     || (o.User != null && o.User.Email.ToLower().Contains(q)))
            .OrderByDescending(o => o.CreatedAt)
            .Take(50)
            .ToListAsync();

        return orders.Select(ToView).ToList();
    }

    public async Task<bool> IsOwnedByAsync(int orderId, int userId) =>
        await _db.Orders.AnyAsync(o => o.Id == orderId && o.UserId == userId);

    public async Task<string> SendBillIfDueAsync(int orderId, bool preferWhatsApp, bool force = false)
    {
        if (!await _settings.GetBoolAsync(SettingKeys.SendBillEnabled, true))
            return "Bill sending is turned off (Admin → Features).";

        var order = await _db.Orders.Include(o => o.Items).Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == orderId);
        if (order is null) return "Order not found.";
        if (!force && order.BillSentAt is not null) return "Bill already sent.";

        string delivery;
        try { delivery = await _notify.SendBillAsync(ToView(order), preferWhatsApp); }
        catch (Exception ex)
        {
            _log.LogWarning(ex, "Bill send failed for order {Id}", orderId);
            delivery = "failed to send";
        }

        order.BillSentAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return delivery;
    }

    public async Task<OrderViewDto?> MarkPaidAsync(int id)
    {
        var order = await _db.Orders.Include(o => o.Items).Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return null;

        order.PaymentStatus = PaymentStatus.Paid;
        order.UpdatedAt = DateTime.UtcNow;

        var payment = await _db.Payments
            .Where(p => p.OrderId == id).OrderByDescending(p => p.Id).FirstOrDefaultAsync();
        if (payment is not null) payment.Status = PaymentStatus.Paid;

        await _db.SaveChangesAsync();
        return ToView(order);
    }

    public async Task<OrderViewDto?> CancelAsync(int id)
    {
        var order = await _db.Orders.Include(o => o.Items).Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return null;

        if (order.Status != OrderStatus.PickupScheduled)
            throw new InvalidOperationException("Only orders still waiting for pickup can be cancelled.");

        order.Status = OrderStatus.Cancelled;
        order.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return ToView(order);
    }

    private static OrderViewDto ToView(Order o) => new(
        o.Id, o.OrderNumber, o.CustomerName, o.CustomerPhone, o.User?.Email,
        o.Channel.ToString(), o.Status.ToString(), o.PaymentStatus.ToString(),
        o.SubTotal, o.DiscountTotal, o.TaxAmount, o.DeliveryFee, o.Total,
        o.PickupAddressText, o.ScheduledPickupAt, o.CreatedAt,
        o.Items.Select(i => new OrderItemViewDto(
            i.ClothTypeId, i.ClothTypeName, i.OriginalUnitPrice, i.UnitPrice,
            i.Quantity, i.UnitPrice * i.Quantity, i.LineDiscount)).ToList(),
        o.PaymentProvider);
}
