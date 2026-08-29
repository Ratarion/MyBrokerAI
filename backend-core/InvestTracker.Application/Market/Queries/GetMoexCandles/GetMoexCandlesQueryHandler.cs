using InvestTracker.Application.Common.Interfaces;
using InvestTracker.Application.Market.Dtos;
using MediatR;

namespace InvestTracker.Application.Market.Queries.GetMoexCandles;

public class GetMoexCandlesQueryHandler
    : IRequestHandler<GetMoexCandlesQuery, IReadOnlyCollection<MoexCandleDto>>
{
    private readonly IMoexQuoteProvider _quoteProvider;

    public GetMoexCandlesQueryHandler(IMoexQuoteProvider quoteProvider)
    {
        _quoteProvider = quoteProvider;
    }

    public Task<IReadOnlyCollection<MoexCandleDto>> Handle(
        GetMoexCandlesQuery request,
        CancellationToken cancellationToken) =>
        _quoteProvider.GetCandlesAsync(request.Ticker, request.From, request.Till, cancellationToken);
}
