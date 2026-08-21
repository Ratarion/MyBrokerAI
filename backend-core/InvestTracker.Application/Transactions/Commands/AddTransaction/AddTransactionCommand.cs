using InvestTracker.Domain.Enums;
using MediatR;

namespace InvestTracker.Application.Transactions.Commands.AddTransaction;

/// <summary>
/// Добавляет операцию (покупка/продажа/дивиденды/пополнение и т.д.) в портфель.
/// Цена и комиссия переданы как decimal + Currency, а не готовый Money —
/// это входной DTO, конвертация в value object происходит в хендлере.
/// </summary>
public record AddTransactionCommand(
    Guid PortfolioId,
    Guid? AssetId,
    TransactionType Type,
    decimal Quantity,
    decimal Price,
    Currency PriceCurrency,
    decimal Fee,
    Currency FeeCurrency,
    DateTimeOffset ExecutedAt) : IRequest<Guid>;
