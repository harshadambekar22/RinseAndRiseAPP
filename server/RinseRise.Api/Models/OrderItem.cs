namespace RinseRise.Api.Models;

/// <summary>A line on an order. Name and price are snapshotted so that
/// later catalogue changes never alter an existing bill.</summary>
public class OrderItem
{
    public int Id { get; set; }

    public int OrderId { get; set; }
    public Order? Order { get; set; }

    public int ClothTypeId { get; set; }

    public string ClothTypeName { get; set; } = string.Empty;

    /// <summary>Catalogue price at the time of order, before any offer discount.</summary>
    public decimal OriginalUnitPrice { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }

    public decimal LineTotal => UnitPrice * Quantity;
    public decimal LineDiscount => (OriginalUnitPrice - UnitPrice) * Quantity;
}
