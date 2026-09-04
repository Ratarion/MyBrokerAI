namespace InvestTracker.Application.Market.Dtos;

/// <summary>
/// Выплата по облигации из MOEX ISS (купон или амортизация).
/// </summary>
public record MoexBondPayoutDto(
    string Ticker,
    DateOnly Date,
    DateOnly? RecordDate,
    string Type, // "Coupon" or "Amortization"
    decimal Value, // Выплата на 1 бумагу
    string Currency);
