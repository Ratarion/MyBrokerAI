using InvestTracker.Domain.Enums;

namespace InvestTracker.WebApi.Contracts;

public record AddTransactionRequest(
    Guid? AssetId,
    TransactionType Type,
    decimal Quantity,
    decimal Price,
    Currency PriceCurrency,
    decimal Fee,
    Currency FeeCurrency,
    DateTimeOffset ExecutedAt);
