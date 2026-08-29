using InvestTracker.Application.Market.Dtos;
using MediatR;

namespace InvestTracker.Application.Market.Queries.GetMoexCandles;

public record GetMoexCandlesQuery(string Ticker, DateOnly From, DateOnly Till)
    : IRequest<IReadOnlyCollection<MoexCandleDto>>;
