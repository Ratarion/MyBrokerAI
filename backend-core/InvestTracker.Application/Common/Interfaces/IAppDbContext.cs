using InvestTracker.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace InvestTracker.Application.Common.Interfaces;

/// <summary>
/// Абстракция над EF Core DbContext. Application работает только с этим интерфейсом,
/// конкретная реализация (Infrastructure/Persistence/AppDbContext) появится на следующем шаге.
/// </summary>
public interface IAppDbContext
{
    DbSet<User> Users { get; }

    DbSet<Portfolio> Portfolios { get; }

    DbSet<Asset> Assets { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
