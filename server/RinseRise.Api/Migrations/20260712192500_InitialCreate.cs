using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace RinseRise.Api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Categories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Slug = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Icon = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    ImageUrl = table.Column<string>(type: "TEXT", maxLength: 400, nullable: true),
                    SortOrder = table.Column<int>(type: "INTEGER", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ProcessSteps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    StepNumber = table.Column<int>(type: "INTEGER", nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 300, nullable: false),
                    Icon = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProcessSteps", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Settings",
                columns: table => new
                {
                    Key = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Value = table.Column<string>(type: "TEXT", maxLength: 400, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Settings", x => x.Key);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Email = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    Phone = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true),
                    PasswordHash = table.Column<string>(type: "TEXT", nullable: true),
                    GoogleId = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                    Role = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ClothTypes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 300, nullable: true),
                    Overview = table.Column<string>(type: "TEXT", maxLength: 800, nullable: true),
                    CategoryId = table.Column<int>(type: "INTEGER", nullable: false),
                    Service = table.Column<int>(type: "INTEGER", nullable: false),
                    PricePerPiece = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    Icon = table.Column<string>(type: "TEXT", maxLength: 40, nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ClothTypes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ClothTypes_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Addresses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    Label = table.Column<string>(type: "TEXT", maxLength: 60, nullable: false),
                    Line1 = table.Column<string>(type: "TEXT", maxLength: 250, nullable: false),
                    Line2 = table.Column<string>(type: "TEXT", maxLength: 250, nullable: true),
                    City = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    State = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Pincode = table.Column<string>(type: "TEXT", maxLength: 10, nullable: false),
                    Latitude = table.Column<double>(type: "REAL", nullable: false),
                    Longitude = table.Column<double>(type: "REAL", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Addresses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Addresses_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Orders",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    OrderNumber = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    UserId = table.Column<int>(type: "INTEGER", nullable: true),
                    CustomerName = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    CustomerPhone = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    Channel = table.Column<int>(type: "INTEGER", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    SubTotal = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    TaxAmount = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    DeliveryFee = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    Total = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    PickupAddressText = table.Column<string>(type: "TEXT", nullable: true),
                    PickupLatitude = table.Column<double>(type: "REAL", nullable: true),
                    PickupLongitude = table.Column<double>(type: "REAL", nullable: true),
                    ScheduledPickupAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    PaymentStatus = table.Column<int>(type: "INTEGER", nullable: false),
                    RazorpayOrderId = table.Column<string>(type: "TEXT", nullable: true),
                    RazorpayPaymentId = table.Column<string>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Orders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Orders_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Offers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Title = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 400, nullable: true),
                    DiscountType = table.Column<int>(type: "INTEGER", nullable: false),
                    DiscountValue = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    Target = table.Column<int>(type: "INTEGER", nullable: false),
                    CategoryId = table.Column<int>(type: "INTEGER", nullable: true),
                    ClothTypeId = table.Column<int>(type: "INTEGER", nullable: true),
                    Code = table.Column<string>(type: "TEXT", maxLength: 40, nullable: true),
                    StartsAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EndsAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    ShowOnHome = table.Column<bool>(type: "INTEGER", nullable: false),
                    BannerImageUrl = table.Column<string>(type: "TEXT", maxLength: 400, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Offers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Offers_Categories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "Categories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Offers_ClothTypes_ClothTypeId",
                        column: x => x.ClothTypeId,
                        principalTable: "ClothTypes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OrderItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    OrderId = table.Column<int>(type: "INTEGER", nullable: false),
                    ClothTypeId = table.Column<int>(type: "INTEGER", nullable: false),
                    ClothTypeName = table.Column<string>(type: "TEXT", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    Quantity = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderItems_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Payments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    OrderId = table.Column<int>(type: "INTEGER", nullable: false),
                    Provider = table.Column<string>(type: "TEXT", nullable: false),
                    ProviderOrderId = table.Column<string>(type: "TEXT", nullable: true),
                    ProviderPaymentId = table.Column<string>(type: "TEXT", nullable: true),
                    Amount = table.Column<decimal>(type: "TEXT", precision: 18, scale: 2, nullable: false),
                    Method = table.Column<string>(type: "TEXT", nullable: false),
                    Status = table.Column<int>(type: "INTEGER", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Payments_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Categories",
                columns: new[] { "Id", "Icon", "ImageUrl", "IsActive", "Name", "Slug", "SortOrder" },
                values: new object[,]
                {
                    { 1, "shirt", null, true, "Men", "men", 1 },
                    { 2, "sparkles", null, true, "Women", "women", 2 },
                    { 3, "baby", null, true, "Kids", "kids", 3 },
                    { 4, "blinds", null, true, "Curtains", "curtains", 4 },
                    { 5, "sofa", null, true, "Sofa & Couch Covers", "sofa-covers", 5 },
                    { 6, "footprints", null, true, "Shoes", "shoes", 6 },
                    { 7, "bed", null, true, "Household", "household", 7 }
                });

            migrationBuilder.InsertData(
                table: "Offers",
                columns: new[] { "Id", "BannerImageUrl", "CategoryId", "ClothTypeId", "Code", "CreatedAt", "Description", "DiscountType", "DiscountValue", "EndsAt", "IsActive", "ShowOnHome", "StartsAt", "Target", "Title" },
                values: new object[] { 1, null, null, null, "FRESH20", new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "New here? Take 20% off your first order.", 0, 20m, new DateTime(2027, 12, 31, 0, 0, 0, 0, DateTimeKind.Utc), true, true, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 0, "20% off your first pickup" });

            migrationBuilder.InsertData(
                table: "ProcessSteps",
                columns: new[] { "Id", "Description", "Icon", "IsActive", "StepNumber", "Title" },
                values: new object[,]
                {
                    { 1, "Pick your items and place an order in under a minute.", "clipboard-list", true, 1, "Book your order" },
                    { 2, "Our rider collects your clothes at your chosen time.", "package", true, 2, "Doorstep pickup" },
                    { 3, "We wash, dry-clean and press with fabric-safe care.", "sparkles", true, 3, "Expert cleaning" },
                    { 4, "Fresh, folded clothes delivered right back to you.", "home", true, 4, "Doorstep delivery" }
                });

            migrationBuilder.InsertData(
                table: "Settings",
                columns: new[] { "Key", "Value" },
                values: new object[,]
                {
                    { "BusinessPhone", "+91 90000 00000" },
                    { "HomeHeadline", "Fresh clothes, without the trip." },
                    { "PickupSchedulingEnabled", "false" },
                    { "ProjectDescription", "Pickup & delivery dry cleaning, without the trip." },
                    { "ProjectIcon", "shirt" },
                    { "ProjectName", "Fresh & Fold" }
                });

            migrationBuilder.InsertData(
                table: "ClothTypes",
                columns: new[] { "Id", "CategoryId", "Description", "Icon", "IsActive", "Name", "Overview", "PricePerPiece", "Service" },
                values: new object[,]
                {
                    { 1, 1, "Formal or casual shirt", "shirt", true, "Shirt", "Collars and cuffs pre-treated, hand-finished and pressed.", 40m, 1 },
                    { 2, 1, "Cotton tee", "shirt", true, "T-Shirt", "Gentle wash that keeps prints and colours intact.", 25m, 0 },
                    { 3, 1, "Formal trousers", "shirt", true, "Trousers / Pants", "Crease-set and pressed to a sharp finish.", 50m, 1 },
                    { 4, 1, "Denim", "shirt", true, "Jeans", "Colour-safe wash that protects the indigo.", 45m, 0 },
                    { 5, 2, "Ethnic kurta", "sparkles", true, "Kurta", "Delicate handling for ethnic fabrics and embroidery.", 60m, 1 },
                    { 6, 2, "Includes roll press", "sparkles", true, "Saree", "Roll-pressed and stored on a hanger to avoid creases.", 120m, 3 },
                    { 7, 1, "Blazer + trouser", "sparkles", true, "Suit (2 pc)", "Two-piece dry cleaned together for an even finish.", 200m, 3 },
                    { 8, 1, "Single blazer", "sparkles", true, "Blazer / Coat", "Structured press that keeps the shoulders sharp.", 150m, 1 },
                    { 9, 7, "Double bedsheet", "bed", true, "Bedsheet (Double)", "Hot-wash hygiene wash, neatly folded.", 90m, 0 },
                    { 10, 4, "Charged per metre", "blinds", true, "Curtain (per m)", "Dust-extracted and finished to hang crease-free.", 70m, 1 },
                    { 11, 1, "Winter jacket", "sparkles", true, "Jacket (Woollen)", "Wool-safe clean that revives loft and warmth.", 180m, 3 },
                    { 12, 1, "Steam press only", "flame", true, "Iron Only (per pc)", "Steam-pressed and ready to wear.", 10m, 2 },
                    { 13, 3, "Children's clothing", "baby", true, "Kids Wear (per pc)", "Skin-friendly, mild detergents for little ones.", 20m, 0 },
                    { 14, 6, "Leather, suede or canvas", "footprints", true, "Shoe Cleaning (pair)", "Deep clean, conditioning and deodorising for one pair.", 150m, 3 },
                    { 15, 5, "Removable covers", "sofa", true, "Sofa Cover (per seat)", "Fabric-safe clean per seat cover.", 120m, 1 },
                    { 16, 2, "Women's dress", "sparkles", true, "Dress / Frock", "Gentle dry clean for dresses and gowns.", 80m, 1 },
                    { 17, 7, "Single blanket", "bed", true, "Blanket (Single)", "Fluff-restoring wash that removes dust and allergens.", 150m, 3 }
                });

            migrationBuilder.InsertData(
                table: "Offers",
                columns: new[] { "Id", "BannerImageUrl", "CategoryId", "ClothTypeId", "Code", "CreatedAt", "Description", "DiscountType", "DiscountValue", "EndsAt", "IsActive", "ShowOnHome", "StartsAt", "Target", "Title" },
                values: new object[] { 2, null, 2, null, null, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), "Sarees, kurtas and dresses — 15% off this season.", 0, 15m, new DateTime(2027, 12, 31, 0, 0, 0, 0, DateTimeKind.Utc), true, true, new DateTime(2025, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), 1, "15% off all Women's wear" });

            migrationBuilder.CreateIndex(
                name: "IX_Addresses_UserId",
                table: "Addresses",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Categories_Slug",
                table: "Categories",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ClothTypes_CategoryId",
                table: "ClothTypes",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Offers_CategoryId",
                table: "Offers",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_Offers_ClothTypeId",
                table: "Offers",
                column: "ClothTypeId");

            migrationBuilder.CreateIndex(
                name: "IX_OrderItems_OrderId",
                table: "OrderItems",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Orders_OrderNumber",
                table: "Orders",
                column: "OrderNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Orders_UserId",
                table: "Orders",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_OrderId",
                table: "Payments",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Addresses");

            migrationBuilder.DropTable(
                name: "Offers");

            migrationBuilder.DropTable(
                name: "OrderItems");

            migrationBuilder.DropTable(
                name: "Payments");

            migrationBuilder.DropTable(
                name: "ProcessSteps");

            migrationBuilder.DropTable(
                name: "Settings");

            migrationBuilder.DropTable(
                name: "ClothTypes");

            migrationBuilder.DropTable(
                name: "Orders");

            migrationBuilder.DropTable(
                name: "Categories");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
