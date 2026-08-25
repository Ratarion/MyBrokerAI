using InvestTracker.Application.Common.Interfaces;
using InvestTracker.Application.Portfolios.Commands.CreatePortfolio;
using InvestTracker.Application.Portfolios.Dtos;
using InvestTracker.Application.Portfolios.Queries.GetPortfolioById;
using InvestTracker.Application.Portfolios.Queries.GetPortfolios;
using InvestTracker.Application.Transactions.Commands.AddTransaction;
using InvestTracker.WebApi.Common;
using InvestTracker.WebApi.Contracts;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InvestTracker.WebApi.Endpoints;

public static class PortfolioEndpoints
{
    public static IEndpointRouteBuilder MapPortfolioEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/portfolios")
            .WithTags("Portfolios")
            .RequireAuthorization();

        group.MapGet("/", async (
            HttpContext httpContext,
            ISender sender,
            CancellationToken cancellationToken) =>
        {
            var userId = httpContext.GetRequiredUserId();
            var portfolios = await sender.Send(new GetPortfoliosQuery(userId), cancellationToken);
            return Results.Ok(portfolios);
        })
        .WithName("GetPortfolios")
        .WithSummary("Список портфелей текущего пользователя")
        .Produces<IReadOnlyCollection<PortfolioListItemDto>>();

        group.MapGet("/{portfolioId:guid}", async (
            Guid portfolioId,
            HttpContext httpContext,
            ISender sender,
            IAppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var userId = httpContext.GetRequiredUserId();

            var owned = await dbContext.Portfolios
                .AnyAsync(p => p.Id == portfolioId && p.UserId == userId, cancellationToken);

            if (!owned)
            {
                return Results.NotFound();
            }

            var portfolio = await sender.Send(new GetPortfolioByIdQuery(portfolioId), cancellationToken);
            return Results.Ok(portfolio);
        })
        .WithName("GetPortfolioById")
        .WithSummary("Детали принадлежащего текущему пользователю портфеля")
        .Produces<PortfolioDetailsDto>()
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/", async (
            CreatePortfolioRequest request,
            HttpContext httpContext,
            ISender sender,
            CancellationToken cancellationToken) =>
        {
            var userId = httpContext.GetRequiredUserId();

            var portfolioId = await sender.Send(
                new CreatePortfolioCommand(userId, request.Name, request.BaseCurrency),
                cancellationToken);

            return Results.Created($"/api/portfolios/{portfolioId}", new { id = portfolioId });
        })
        .WithName("CreatePortfolio")
        .WithSummary("Создать портфель для текущего пользователя")
        .Produces(StatusCodes.Status201Created)
        .ProducesValidationProblem();

        group.MapPost("/{portfolioId:guid}/transactions", async (
            Guid portfolioId,
            AddTransactionRequest request,
            HttpContext httpContext,
            ISender sender,
            IAppDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var userId = httpContext.GetRequiredUserId();

            var owned = await dbContext.Portfolios
                .AnyAsync(p => p.Id == portfolioId && p.UserId == userId, cancellationToken);

            if (!owned)
            {
                return Results.NotFound();
            }

            var transactionId = await sender.Send(
                new AddTransactionCommand(
                    portfolioId,
                    request.AssetId,
                    request.Type,
                    request.Quantity,
                    request.Price,
                    request.PriceCurrency,
                    request.Fee,
                    request.FeeCurrency,
                    request.ExecutedAt),
                cancellationToken);

            return Results.Created(
                $"/api/portfolios/{portfolioId}/transactions/{transactionId}",
                new { id = transactionId });
        })
        .WithName("AddTransaction")
        .WithSummary("Добавить операцию в свой портфель")
        .Produces(StatusCodes.Status201Created)
        .ProducesValidationProblem()
        .ProducesProblem(StatusCodes.Status404NotFound);

        return app;
    }
}
