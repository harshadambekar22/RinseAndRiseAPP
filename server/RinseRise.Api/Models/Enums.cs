namespace RinseRise.Api.Models;

public enum UserRole
{
    Customer = 0,
    Admin = 1
}

/// <summary>The kind of cleaning service applied to a garment.</summary>
public enum ServiceType
{
    WashAndFold = 0,
    DryClean = 1,
    Ironing = 2,
    Premium = 3
}

/// <summary>Lifecycle of an order, used for live tracking.</summary>
public enum OrderStatus
{
    Placed = 0,
    PickupScheduled = 1,
    PickedUp = 2,
    InCleaning = 3,
    ReadyForDelivery = 4,
    OutForDelivery = 5,
    Delivered = 6,
    Cancelled = 7
}

public enum PaymentStatus
{
    Pending = 0,
    Paid = 1,
    Failed = 2,
    Refunded = 3
}

/// <summary>Where the order originated.</summary>
public enum OrderChannel
{
    Online = 0,   // placed by a customer through the website
    Shop = 1      // placed by an admin at the counter (walk-in)
}

/// <summary>How an offer reduces the price.</summary>
public enum DiscountType
{
    Percentage = 0,   // e.g. 20% off
    Flat = 1          // e.g. ₹30 off
}

/// <summary>What an offer applies to.</summary>
public enum OfferTarget
{
    AllItems = 0,     // storewide
    Category = 1,     // every item in one category
    ClothType = 2     // one specific item
}
