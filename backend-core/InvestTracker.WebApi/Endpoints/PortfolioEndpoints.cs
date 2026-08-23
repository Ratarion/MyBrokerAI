using InvestTracker.Application.Portfolios.Commands.CreatePortfolio;
using InvestTracker.Application.Transactions.Commands.AddTransaction;
using InvestTracker.WebApi.Contracts;
using MediatR;

namespace InvestTracker.WebApi.Endpoints;

public static class PortfolioEndpoints
{
    public static IEndpointRouteBuilder MapPortfolioEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/portfolios").WithTags("Portfolios");

        group.MapPost("/", async (
            CreatePortfolioRequest request,
            ISender sender,
            CancellationToken cancellationToken) =>
        {
            var command = new CreatePortfolioCommand(request.UserId, request.Name, request.BaseCurrency);
            var portfolioId = await sender.Send(command, cancellationToken);

            return Results.Created($"/api/portfolios/{portfolioId}", new { id = portfolioId });
        })
        .WithName("CreatePortfolio")
        .WithSummary("Создать портфель для существующего пользователя")
        .Produces(StatusCodes.Status201Created)
        .ProducesValidationProblem()
        .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{portfolioId:guid}/transactions", async (
            Guid portfolioId,
            AddTransactionRequest request,
            ISender sender,
            CancellationToken cancellationToken) =>
        {
            var command = new AddTransactionCommand(
                portfolioId,
                request.AssetId,
                request.Type,
                request.Quantity,
                request.Price,
                request.PriceCurrency,
                request.Fee,
                request.FeeCurrency,
                request.ExecutedAt);

            var transactionId = await sender.Send(command, cancellationToken);

            return Results.Created(
                $"/api/portfolios/{portfolioId}/transactions/{transactionId}",
                new { id = transactionId });
        })
        .WithName("AddTransaction")
        .WithSummary("Добавить операцию (покупка/продажа/дивиденды и т.д.) в портфель")
        .Produces(StatusCodes.Status201Created)
        .ProducesValidationProblem()
        .ProducesProblem(StatusCodes.Status404NotFound);

        return app;
    }
}
