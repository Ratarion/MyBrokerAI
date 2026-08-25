using InvestTracker.Application.Auth;
using InvestTracker.Application.Common.Interfaces;
using InvestTracker.Infrastructure.Persistence;
using InvestTracker.Infrastructure.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace InvestTracker.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Регистрирует EF Core AppDbContext (PostgreSQL) и связывает его с IAppDbContext,
    /// который использует Application. Вызывается один раз из Program.cs в WebApi.
    /// </summary>
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException(
                "Строка подключения 'Postgres' не найдена в конфигурации (ConnectionStrings:Postgres).");

        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());

        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IAuthService, JwtAuthService>();

        return services;
    }
}
