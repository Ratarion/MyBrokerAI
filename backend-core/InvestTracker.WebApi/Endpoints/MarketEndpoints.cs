using InvestTracker.Application.Market.Dtos;
using InvestTracker.Application.Market.Queries.GetMoexCandles;
using MediatR;

namespace InvestTracker.WebApi.Endpoints;

public static class MarketEndpoints
{
    public static IEndpointRouteBuilder MapMarketEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/market/moex").WithTags("Market");

        group.MapGet("/{ticker}/candles", async (
            string ticker,
            DateOnly? from,
            DateOnly? till,
            ISender sender,
            CancellationToken cancellationToken) =>
        {
            var end = till ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var start = from ?? end.AddDays(-180);

            var candles = await sender.Send(new GetMoexCandlesQuery(ticker, start, end), cancellationToken);

            return Results.Ok(candles);
        })
        .WithName("GetMoexCandles")
        .WithSummary("Дневные свечи с МосБиржи по тикеру (например IMOEX, SBER, GAZP, LKOH)")
        .Produces<IReadOnlyCollection<MoexCandleDto>>()
        .ProducesValidationProblem();

        return app;
    }
}
