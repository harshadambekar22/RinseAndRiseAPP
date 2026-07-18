using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RinseRise.Api.Migrations
{
    /// <inheritdoc />
    public partial class RenameProjectDefaults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Settings",
                keyColumn: "Key",
                keyValue: "ProjectName",
                column: "Value",
                value: "Rinse & Rise");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Settings",
                keyColumn: "Key",
                keyValue: "ProjectName",
                column: "Value",
                value: "Fresh & Fold");
        }
    }
}
