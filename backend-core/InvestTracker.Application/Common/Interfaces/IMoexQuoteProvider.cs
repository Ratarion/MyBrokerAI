using InvestTracker.Application.Market.Dtos;
using InvestTracker.Domain.Enums;

namespace InvestTracker.Application.Common.Interfaces;

public interface IMoexQuoteProvider
{
    /// <summary>Дневные свечи по тикеру за период. Пустой список, если тикер не найден на бирже.</summary>
    Task<IReadOnlyCollection<MoexCandleDto>> GetCandlesAsync(
        string ticker,
        DateOnly from,
        DateOnly till,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Получить текущие котировки (последняя цена + НКД) для списка инструментов.
    /// Тикеры, не найденные на бирже (или без сделок), не попадают в результат.
    /// </summary>
    Task<IReadOnlyDictionary<string, MoexCurrentQuoteDto>> GetCurrentPricesAsync(
        IEnumerable<(string Ticker, AssetType AssetType)> instruments,
        CancellationToken cancellationToken = default);

    /// <summary>Получить текущий биржевой курс юаня к рублю (CNYRUB_TOM).</summary>
    Task<decimal> GetCnyRubRateAsync(CancellationToken cancellationToken = default);
}
