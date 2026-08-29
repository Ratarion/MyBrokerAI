using InvestTracker.Application.Market.Dtos;

namespace InvestTracker.Application.Common.Interfaces;

public interface IMoexQuoteProvider
{
    /// <summary>Дневные свечи по тикеру за период. Пустой список, если тикер не найден на бирже.</summary>
    Task<IReadOnlyCollection<MoexCandleDto>> GetCandlesAsync(
        string ticker,
        DateOnly from,
        DateOnly till,
        CancellationToken cancellationToken = default);
}
