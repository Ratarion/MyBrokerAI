using InvestTracker.Domain.Enums;

namespace InvestTracker.Application.Portfolios.Dtos;

public record PortfolioListItemDto(
    Guid Id,
    string Name,
    Currency BaseCurrency,
    int TransactionsCount,
    DateTimeOffset CreatedAt);
