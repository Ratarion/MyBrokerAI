using InvestTracker.Domain.Enums;

namespace InvestTracker.Application.Portfolios.Dtos;

public record TransactionDto(
    Guid Id,
    Guid? AssetId,
    TransactionType Type,
    decimal Quantity,
    decimal PriceAmount,
    Currency PriceCurrency,
    decimal FeeAmount,
    Currency FeeCurrency,
    DateTimeOffset ExecutedAt,
    string? Notes);
