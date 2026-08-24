using System.Reflection;
using InvestTracker.Application.Common.Interfaces;
using InvestTracker.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace InvestTracker.Infrastructure.Persistence;

public class AppDbContext : DbContext, IAppDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<Portfolio> Portfolios => Set<Portfolio>();

    public DbSet<Asset> Assets => Set<Asset>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Подхватывает все IEntityTypeConfiguration<T> из Persistence/Configurations.
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

        base.OnModelCreating(modelBuilder);
    }
}
