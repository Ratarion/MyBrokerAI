using System.Reflection;
using FluentValidation;
using InvestTracker.Application.Common.Behaviours;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace InvestTracker.Application;

public static class DependencyInjection
{
    /// <summary>
    /// Регистрирует MediatR (команды/запросы + пайплайн валидации) и все валидаторы
    /// из сборки Application. Вызывается один раз из Program.cs в WebApi.
    /// </summary>
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        services.AddValidatorsFromAssembly(assembly);

        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));

        services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehaviour<,>));

        return services;
    }
}
