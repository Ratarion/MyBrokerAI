using InvestTracker.Domain.Enums;

namespace InvestTracker.Application.Portfolios.Dtos;

/// <summary>
/// Открытая позиция с рыночной оценкой и нереализованным PnL.
/// HasQuote = false означает, что МосБиржа не вернула цену для этого инструмента
/// (инструмент не торгуется сейчас, биржа закрыта и нет данных и т.д.).
/// </summary>
public record HoldingMarketValueDto(
    Guid AssetId,
    string Ticker,
    string Name,
    AssetType AssetType,
    decimal Quantity,
    decimal AvgPrice,
    Currency Currency,
    bool HasQuote,
    decimal LastPrice,
    decimal MarketValue,
    decimal TotalCost,
    decimal UnrealizedPnl,
    decimal UnrealizedPnlPct);
