using InvestTracker.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvestTracker.Infrastructure.Persistence.Configurations;

public class TransactionConfiguration : IEntityTypeConfiguration<Transaction>
{
    public void Configure(EntityTypeBuilder<Transaction> builder)
    {
        builder.ToTable("Transactions");

        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).ValueGeneratedNever();

        builder.Property(t => t.Type)
            .IsRequired();

        builder.Property(t => t.Quantity)
            .HasPrecision(28, 10);

        // Money (Price/Fee) — value object из двух полей, маппим как complex property
        // (EF Core 8+): отдельные колонки в той же таблице, без отдельной "сущности".
        builder.ComplexProperty(t => t.Price, price =>
        {
            price.Property(m => m.Amount)
                .HasColumnName("PriceAmount")
                .HasPrecision(28, 10);

            price.Property(m => m.Currency)
                .HasColumnName("PriceCurrency");
        });

        builder.ComplexProperty(t => t.Fee, fee =>
        {
            fee.Property(m => m.Amount)
                .HasColumnName("FeeAmount")
                .HasPrecision(28, 10);

            fee.Property(m => m.Currency)
                .HasColumnName("FeeCurrency");
        });

        builder.Property(t => t.ExecutedAt)
            .IsRequired();

        builder.Property(t => t.Notes)
            .HasMaxLength(1000);

        builder.Property(t => t.ExternalId)
            .HasMaxLength(100);

        // Дедуп при повторном импорте одного и того же отчёта: в пределах портфеля
        // ExternalId должен быть уникален, но только когда он задан (ручные транзакции — null).
        builder.HasIndex(t => new { t.PortfolioId, t.ExternalId })
            .IsUnique()
            .HasFilter("\"ExternalId\" IS NOT NULL");

        // Asset — отдельный агрегат, ссылка только по Id, без навигационного свойства.
        builder.HasOne<Asset>()
            .WithMany()
            .HasForeignKey(t => t.AssetId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
