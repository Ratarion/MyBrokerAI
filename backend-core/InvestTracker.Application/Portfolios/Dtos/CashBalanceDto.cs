using InvestTracker.Domain.Enums;

namespace InvestTracker.Application.Portfolios.Dtos;

/// <summary>
/// Денежный остаток в одной валюте.
/// Рассчитывается на лету из транзакций как сумма пополнений/выводов/сделок/дивидендов/налогов.
/// </summary>
public record CashBalanceDto(Currency Currency, decimal Amount);
