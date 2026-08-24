using InvestTracker.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace InvestTracker.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users");

        builder.HasKey(u => u.Id);
        builder.Property(u => u.Id).ValueGeneratedNever();

        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(320);

        builder.HasIndex(u => u.Email).IsUnique();

        builder.Property(u => u.DisplayName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(u => u.PasswordHash)
            .IsRequired();

        // Portfolios хранится как private List<Portfolio> _portfolios, наружу торчит
        // только IReadOnlyCollection<Portfolio> — заставляем EF писать/читать напрямую в поле.
        builder.Navigation(u => u.Portfolios)
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasMany(u => u.Portfolios)
            .WithOne()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
