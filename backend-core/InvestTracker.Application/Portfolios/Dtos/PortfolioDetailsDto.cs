using InvestTracker.Domain.Enums;

namespace InvestTracker.Application.Portfolios.Dtos;

public record PortfolioDetailsDto(
    Guid Id,
    Guid UserId,
    string Name,
    Currency BaseCurrency,
    DateTimeOffset CreatedAt,
    IReadOnlyCollection<TransactionDto> Transactions,
    IReadOnlyCollection<HoldingDto> Holdings,
    IReadOnlyCollection<CashBalanceDto> CashBalances);
