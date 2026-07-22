using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RinseRise.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderDiscountFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "DiscountTotal",
                table: "Orders",
                type: "TEXT",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "OriginalUnitPrice",
                table: "OrderItems",
                type: "TEXT",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            // Backfill: snapshot the current unit price as the "original" price
            // for every existing order line, so old invoices show zero discount
            // instead of a spurious one.
            migrationBuilder.Sql(
                "UPDATE OrderItems SET OriginalUnitPrice = UnitPrice WHERE OriginalUnitPrice = 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DiscountTotal",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "OriginalUnitPrice",
                table: "OrderItems");
        }
    }
}
