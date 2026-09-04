namespace InvestTracker.Application.Portfolios.Dtos;

/// <summary>
/// Элемент календаря выплат (историческая выплата или будущая объявленная/прогнозная).
/// </summary>
public record PortfolioPayoutItemDto(
    string Id,
    Guid? AssetId,
    string? AssetTicker,
    string? AssetName,
    string Type, // "Dividend", "Coupon", "Amortization", "Tax"
    decimal Amount,
    string Currency,
    DateTimeOffset ExecutedAt,
    DateTimeOffset? RecordDate,
    string Status, // "Выплачены", "Удержан", "Погашения/амортизация", "Объявлены", "Прогноз"
    string? Calculation, // e.g. "5 × 250,00 ₽"
    bool IsFuture);

public record PortfolioPayoutsScheduleDto(
    IReadOnlyCollection<PortfolioPayoutItemDto> Payouts,
    decimal TotalUpcomingYear,
    decimal AvgPerMonth);
