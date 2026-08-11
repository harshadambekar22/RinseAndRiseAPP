using RinseRise.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace RinseRise.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<ClothType> ClothTypes => Set<ClothType>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Offer> Offers => Set<Offer>();
    public DbSet<ProcessStep> ProcessSteps => Set<ProcessStep>();
    public DbSet<Setting> Settings => Set<Setting>();

    // Fixed timestamps for seed rows (HasData must not use DateTime.UtcNow, or
    // every migration would detect a change).
    private static readonly DateTime SeedStart = new(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
    private static readonly DateTime SeedEnd = new(2027, 12, 31, 0, 0, 0, DateTimeKind.Utc);

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<User>().HasIndex(u => u.Email).IsUnique();
        b.Entity<Order>().HasIndex(o => o.OrderNumber).IsUnique();
        b.Entity<Category>().HasIndex(c => c.Slug).IsUnique();

        // Don't let deleting a category/item cascade into related rows unexpectedly.
        b.Entity<ClothType>()
            .HasOne(c => c.Category).WithMany()
            .HasForeignKey(c => c.CategoryId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Offer>()
            .HasOne(o => o.Category).WithMany()
            .HasForeignKey(o => o.CategoryId).OnDelete(DeleteBehavior.Restrict);
        b.Entity<Offer>()
            .HasOne(o => o.ClothType).WithMany()
            .HasForeignKey(o => o.ClothTypeId).OnDelete(DeleteBehavior.Restrict);

        // Money columns use decimal(18,2) so currency stays exact.
        foreach (var prop in b.Model.GetEntityTypes()
                     .SelectMany(t => t.GetProperties())
                     .Where(p => p.ClrType == typeof(decimal) || p.ClrType == typeof(decimal?)))
        {
            prop.SetPrecision(18);
            prop.SetScale(2);
        }

        b.Entity<OrderItem>().Ignore(i => i.LineTotal);
        b.Entity<OrderItem>().Ignore(i => i.LineDiscount);

        SeedCategories(b);
        SeedCatalogue(b);
        SeedProcessSteps(b);
        SeedSettings(b);
        SeedOffers(b);
    }

    private static void SeedCategories(ModelBuilder b)
    {
        b.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Men",                 Slug = "men",          Icon = "shirt",      SortOrder = 1 },
            new Category { Id = 2, Name = "Women",               Slug = "women",        Icon = "sparkles",   SortOrder = 2 },
            new Category { Id = 3, Name = "Kids",                Slug = "kids",         Icon = "baby",       SortOrder = 3 },
            new Category { Id = 4, Name = "Curtains",            Slug = "curtains",     Icon = "blinds",     SortOrder = 4 },
            new Category { Id = 5, Name = "Sofa & Couch Covers", Slug = "sofa-covers",  Icon = "sofa",       SortOrder = 5 },
            new Category { Id = 6, Name = "Shoes",               Slug = "shoes",        Icon = "footprints", SortOrder = 6 },
            new Category { Id = 7, Name = "Household",           Slug = "household",     Icon = "bed",        SortOrder = 7 }
        );
    }

    private static void SeedCatalogue(ModelBuilder b)
    {
        b.Entity<ClothType>().HasData(
            new ClothType { Id = 1,  CategoryId = 1, Name = "Shirt",             Service = ServiceType.DryClean,    PricePerPiece = 40,  Icon = "shirt",      Description = "Formal or casual shirt", Overview = "Collars and cuffs pre-treated, hand-finished and pressed." },
            new ClothType { Id = 2,  CategoryId = 1, Name = "T-Shirt",           Service = ServiceType.WashAndFold, PricePerPiece = 25,  Icon = "shirt",      Description = "Cotton tee", Overview = "Gentle wash that keeps prints and colours intact." },
            new ClothType { Id = 3,  CategoryId = 1, Name = "Trousers / Pants",   Service = ServiceType.DryClean,    PricePerPiece = 50,  Icon = "shirt",      Description = "Formal trousers", Overview = "Crease-set and pressed to a sharp finish." },
            new ClothType { Id = 4,  CategoryId = 1, Name = "Jeans",             Service = ServiceType.WashAndFold, PricePerPiece = 45,  Icon = "shirt",      Description = "Denim", Overview = "Colour-safe wash that protects the indigo." },
            new ClothType { Id = 5,  CategoryId = 2, Name = "Kurta",             Service = ServiceType.DryClean,    PricePerPiece = 60,  Icon = "sparkles",   Description = "Ethnic kurta", Overview = "Delicate handling for ethnic fabrics and embroidery." },
            new ClothType { Id = 6,  CategoryId = 2, Name = "Saree",             Service = ServiceType.Premium,     PricePerPiece = 120, Icon = "sparkles",   Description = "Includes roll press", Overview = "Roll-pressed and stored on a hanger to avoid creases." },
            new ClothType { Id = 7,  CategoryId = 1, Name = "Suit (2 pc)",        Service = ServiceType.Premium,     PricePerPiece = 200, Icon = "sparkles",   Description = "Blazer + trouser", Overview = "Two-piece dry cleaned together for an even finish." },
            new ClothType { Id = 8,  CategoryId = 1, Name = "Blazer / Coat",      Service = ServiceType.DryClean,    PricePerPiece = 150, Icon = "sparkles",   Description = "Single blazer", Overview = "Structured press that keeps the shoulders sharp." },
            new ClothType { Id = 9,  CategoryId = 7, Name = "Bedsheet (Double)",  Service = ServiceType.WashAndFold, PricePerPiece = 90,  Icon = "bed",        Description = "Double bedsheet", Overview = "Hot-wash hygiene wash, neatly folded." },
            new ClothType { Id = 10, CategoryId = 4, Name = "Curtain (per m)",    Service = ServiceType.DryClean,    PricePerPiece = 70,  Icon = "blinds",     Description = "Charged per metre", Overview = "Dust-extracted and finished to hang crease-free." },
            new ClothType { Id = 11, CategoryId = 1, Name = "Jacket (Woollen)",   Service = ServiceType.Premium,     PricePerPiece = 180, Icon = "sparkles",   Description = "Winter jacket", Overview = "Wool-safe clean that revives loft and warmth." },
            new ClothType { Id = 12, CategoryId = 1, Name = "Iron Only (per pc)", Service = ServiceType.Ironing,     PricePerPiece = 10,  Icon = "flame",      Description = "Steam press only", Overview = "Steam-pressed and ready to wear." },
            new ClothType { Id = 13, CategoryId = 3, Name = "Kids Wear (per pc)", Service = ServiceType.WashAndFold, PricePerPiece = 20,  Icon = "baby",       Description = "Children's clothing", Overview = "Skin-friendly, mild detergents for little ones." },
            new ClothType { Id = 14, CategoryId = 6, Name = "Shoe Cleaning (pair)",Service = ServiceType.Premium,    PricePerPiece = 150, Icon = "footprints", Description = "Leather, suede or canvas", Overview = "Deep clean, conditioning and deodorising for one pair." },
            new ClothType { Id = 15, CategoryId = 5, Name = "Sofa Cover (per seat)",Service = ServiceType.DryClean,  PricePerPiece = 120, Icon = "sofa",       Description = "Removable covers", Overview = "Fabric-safe clean per seat cover." },
            new ClothType { Id = 16, CategoryId = 2, Name = "Dress / Frock",      Service = ServiceType.DryClean,    PricePerPiece = 80,  Icon = "sparkles",   Description = "Women's dress", Overview = "Gentle dry clean for dresses and gowns." },
            new ClothType { Id = 17, CategoryId = 7, Name = "Blanket (Single)",   Service = ServiceType.Premium,     PricePerPiece = 150, Icon = "bed",        Description = "Single blanket", Overview = "Fluff-restoring wash that removes dust and allergens." }
        );
    }

    private static void SeedProcessSteps(ModelBuilder b)
    {
        b.Entity<ProcessStep>().HasData(
            new ProcessStep { Id = 1, StepNumber = 1, Title = "Book your order",   Icon = "clipboard-list", Description = "Pick your items and place an order in under a minute." },
            new ProcessStep { Id = 2, StepNumber = 2, Title = "Doorstep pickup",   Icon = "package",        Description = "Our rider collects your clothes at your chosen time." },
            new ProcessStep { Id = 3, StepNumber = 3, Title = "Expert cleaning",   Icon = "sparkles",       Description = "We wash, dry-clean and press with fabric-safe care." },
            new ProcessStep { Id = 4, StepNumber = 4, Title = "Doorstep delivery", Icon = "home",           Description = "Fresh, folded clothes delivered right back to you." }
        );
    }

    private static void SeedSettings(ModelBuilder b)
    {
        b.Entity<Setting>().HasData(
            new Setting { Key = SettingKeys.PickupSchedulingEnabled, Value = "false" },
            new Setting { Key = SettingKeys.SendBillEnabled,         Value = "true" },
            new Setting { Key = SettingKeys.PayAtPickupEnabled,      Value = "false" },
            new Setting { Key = SettingKeys.BusinessPhone,           Value = "+91 90000 00000" },
            new Setting { Key = SettingKeys.HomeHeadline,            Value = "Fresh clothes, without the trip." },
            new Setting { Key = SettingKeys.ProjectName,             Value = "Rinse & Rise" },
            new Setting { Key = SettingKeys.ProjectDescription,      Value = "Pickup & delivery dry cleaning, without the trip." },
            new Setting { Key = SettingKeys.ProjectIcon,             Value = "shirt" }
        );
    }

    private static void SeedOffers(ModelBuilder b)
    {
        b.Entity<Offer>().HasData(
            new Offer
            {
                Id = 1, Title = "20% off your first pickup",
                Description = "New here? Take 20% off your first order.",
                DiscountType = DiscountType.Percentage, DiscountValue = 20, Target = OfferTarget.AllItems,
                Code = "FRESH20", StartsAt = SeedStart, EndsAt = SeedEnd,
                IsActive = true, ShowOnHome = true, CreatedAt = SeedStart
            },
            new Offer
            {
                Id = 2, Title = "15% off all Women's wear",
                Description = "Sarees, kurtas and dresses — 15% off this season.",
                DiscountType = DiscountType.Percentage, DiscountValue = 15, Target = OfferTarget.Category,
                CategoryId = 2, StartsAt = SeedStart, EndsAt = SeedEnd,
                IsActive = true, ShowOnHome = true, CreatedAt = SeedStart
            }
        );
    }
}
