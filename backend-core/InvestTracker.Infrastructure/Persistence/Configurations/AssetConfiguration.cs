using InvestTracker.Domain.Entities;
using InvestTracker.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvestTracker.Infrastructure.Persistence.Configurations;

public class AssetConfiguration : IEntityTypeConfiguration<Asset>
{
    public void Configure(EntityTypeBuilder<Asset> builder)
    {
        builder.ToTable("Assets");

        builder.HasKey(a => a.Id);
        builder.Property(a => a.Id).ValueGeneratedNever();

        // Ticker — readonly record struct-обёртка над string, храним как обычную строковую колонку.
        builder.Property(a => a.Ticker)
            .HasConversion(ticker => ticker.Symbol, symbol => new Ticker(symbol))
            .HasMaxLength(20)
            .IsRequired();

        builder.HasIndex(a => a.Ticker).IsUnique();

        builder.Property(a => a.Name)
            .IsRequired()
            .HasMaxLength(300);

        builder.Property(a => a.Type)
            .IsRequired();

        builder.Property(a => a.Currency)
            .IsRequired();

        builder.Property(a => a.Isin)
            .HasMaxLength(12);
    }
}
