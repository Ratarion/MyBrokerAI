using InvestTracker.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvestTracker.Infrastructure.Persistence.Configurations;

public class PortfolioConfiguration : IEntityTypeConfiguration<Portfolio>
{
    public void Configure(EntityTypeBuilder<Portfolio> builder)
    {
        builder.ToTable("Portfolios");

        builder.HasKey(p => p.Id);
        builder.Property(p => p.Id).ValueGeneratedNever();

        builder.Property(p => p.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(p => p.BaseCurrency)
            .IsRequired();

        // Transactions — private List<Transaction> _transactions за IReadOnlyCollection.
        builder.Navigation(p => p.Transactions)
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasMany(p => p.Transactions)
            .WithOne()
            .HasForeignKey(t => t.PortfolioId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
