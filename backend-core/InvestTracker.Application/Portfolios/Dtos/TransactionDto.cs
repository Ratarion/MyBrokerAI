using InvestTracker.Domain.Enums;

namespace InvestTracker.Application.Portfolios.Dtos;

public record TransactionDto(
    Guid Id,
    Guid? AssetId,
    string? AssetTicker,
    string? AssetName,
    TransactionType Type,
    decimal Quantity,
    decimal PriceAmount,
    Currency PriceCurrency,
    decimal FeeAmount,
    Currency FeeCurrency,
    DateTimeOffset ExecutedAt,
    string? Notes);
