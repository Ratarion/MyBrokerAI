using System.Text.Json.Serialization;
using InvestTracker.Application;
using InvestTracker.Infrastructure;
using InvestTracker.WebApi.Common;
using InvestTracker.WebApi.Endpoints;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// MediatR + FluentValidation + пайплайн валидации (InvestTracker.Application/DependencyInjection.cs).
builder.Services.AddApplicationServices();

// EF Core + PostgreSQL, реализация IAppDbContext (InvestTracker.Infrastructure/DependencyInjection.cs).
builder.Services.AddInfrastructureServices(builder.Configuration);

// Enum'ы (Currency, TransactionType, AssetType) сериализуются как строки ("RUB", "Buy"),
// а не как числа — так их гораздо проще читать и передавать в запросах.
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// Единая обработка исключений: NotFoundException -> 404, ValidationException -> 400, и т.д.
// См. InvestTracker.WebApi/Common/GlobalExceptionHandler.cs
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

var app = builder.Build();

app.UseExceptionHandler();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.MapPortfolioEndpoints();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
