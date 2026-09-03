using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InvestTracker.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTransactionExternalId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transactions_PortfolioId",
                table: "Transactions");

            migrationBuilder.AddColumn<string>(
                name: "ExternalId",
                table: "Transactions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_PortfolioId_ExternalId",
                table: "Transactions",
                columns: new[] { "PortfolioId", "ExternalId" },
                unique: true,
                filter: "\"ExternalId\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Transactions_PortfolioId_ExternalId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "ExternalId",
                table: "Transactions");

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_PortfolioId",
                table: "Transactions",
                column: "PortfolioId");
        }
    }
}
