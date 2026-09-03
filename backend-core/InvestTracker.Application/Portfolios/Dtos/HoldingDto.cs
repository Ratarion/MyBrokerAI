using InvestTracker.Domain.Enums;

namespace InvestTracker.Application.Portfolios.Dtos;

/// <summary>
/// Открытая позиция в портфеле: сколько бумаги на руках и по какой средней цене куплено.
/// Рассчитывается на лету из транзакций методом средневзвешенной цены (Weighted Average).
/// </summary>
public record HoldingDto(
    Guid AssetId,
    string Ticker,
    string Name,
    AssetType AssetType,
    decimal Quantity,
    decimal AvgPrice,
    Currency AvgPriceCurrency);
