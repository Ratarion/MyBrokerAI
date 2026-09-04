using InvestTracker.Domain.Enums;

namespace InvestTracker.Application.Imports.Dtos;

/// <summary>Ценная бумага, встреченная в отчёте — источник для создания/поиска Asset.</summary>
public record ParsedSecurity(string Code, string Name, AssetType? AssetType = null);

/// <summary>Сделка купли/продажи из отчёта.</summary>
public record ParsedTrade(
    DateTimeOffset ExecutedAt,
    string SecurityCode,
    TransactionType Type,
    decimal Quantity,
    decimal Price,
    decimal Fee,
    Currency Currency,
    string ExternalId,
    string? Notes);

/// <summary>
/// Денежная операция из отчёта (пополнение/вывод/налог/дивиденды/купоны).
/// SecurityCode — null для чисто денежных операций (Deposit/Withdrawal/Tax).
/// </summary>
public record ParsedCashFlow(
    DateTimeOffset ExecutedAt,
    TransactionType Type,
    decimal Amount,
    Currency Currency,
    string? SecurityCode,
    string ExternalId,
    string Description);

public record ParsedBrokerReport(
    IReadOnlyCollection<ParsedSecurity> Securities,
    IReadOnlyCollection<ParsedTrade> Trades,
    IReadOnlyCollection<ParsedCashFlow> CashFlows,
    IReadOnlyCollection<string> UnrecognizedDescriptions);
