using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RinseRise.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddGoogleSignInFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Settings",
                columns: new[] { "Key", "Value" },
                values: new object[] { "GoogleSignInEnabled", "true" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Settings",
                keyColumn: "Key",
                keyValue: "GoogleSignInEnabled");
        }
    }
}
