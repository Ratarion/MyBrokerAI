namespace InvestTracker.Application.Portfolios.Dtos;

/// <summary>
/// Агрегированная рыночная оценка портфеля на момент запроса.
/// TotalMarketValue учитывает только позиции, для которых получена котировка.
/// </summary>
public record PortfolioMarketValueDto(
    decimal TotalMarketValue,
    decimal TotalCost,
    decimal TotalUnrealizedPnl,
    decimal TotalUnrealizedPnlPct,
    IReadOnlyCollection<HoldingMarketValueDto> Holdings,
    DateTimeOffset FetchedAt);
