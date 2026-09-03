using InvestTracker.Domain.Common;
using InvestTracker.Domain.Enums;
using InvestTracker.Domain.Exceptions;
using InvestTracker.Domain.ValueObjects;

namespace InvestTracker.Domain.Entities;

/// <summary>
/// Операция в портфеле: покупка/продажа актива, дивиденды, пополнение и т.д.
/// Транзакция неизменяема по своей природе (факт из прошлого),
/// поэтому у неё нет методов редактирования уже совершённых данных, кроме заметки.
/// </summary>
public class Transaction : AuditableEntity
{
    public Guid PortfolioId { get; private set; }

    /// <summary>Null для чисто денежных операций (Deposit, Withdrawal).</summary>
    public Guid? AssetId { get; private set; }

    public TransactionType Type { get; private set; }

    public decimal Quantity { get; private set; }

    public Money Price { get; private set; }

    public Money Fee { get; private set; }

    public DateTimeOffset ExecutedAt { get; private set; }

    public string? Notes { get; private set; }

    /// <summary>
    /// Внешний идентификатор операции у брокера (например, номер сделки).
    /// Используется для дедупликации при повторном импорте одного и того же отчёта.
    /// Null для транзакций, созданных вручную.
    /// </summary>
    public string? ExternalId { get; private set; }

    private Transaction()
    {
        // Для EF Core.
    }

    private Transaction(
        Guid id,
        Guid portfolioId,
        Guid? assetId,
        TransactionType type,
        decimal quantity,
        Money price,
        Money fee,
        DateTimeOffset executedAt,
        string? externalId) : base(id)
    {
        PortfolioId = portfolioId;
        AssetId = assetId;
        Type = type;
        Quantity = quantity;
        Price = price;
        Fee = fee;
        ExecutedAt = executedAt;
        ExternalId = externalId;
    }

    public static Transaction Create(
        Guid portfolioId,
        Guid? assetId,
        TransactionType type,
        decimal quantity,
        Money price,
        Money fee,
        DateTimeOffset executedAt,
        string? externalId = null)
    {
        if (portfolioId == Guid.Empty)
        {
            throw new DomainException("Транзакция должна быть привязана к портфелю.");
        }

        if (RequiresAsset(type) && assetId is null)
        {
            throw new DomainException($"Для операции типа '{type}' необходимо указать актив.");
        }

        if (quantity < 0)
        {
            throw new DomainException("Количество не может быть отрицательным.");
        }

        if (price.Amount < 0)
        {
            throw new DomainException("Цена не может быть отрицательной.");
        }

        if (fee.Amount < 0)
        {
            throw new DomainException("Комиссия не может быть отрицательной.");
        }

        return new Transaction(Guid.NewGuid(), portfolioId, assetId, type, quantity, price, fee, executedAt, externalId);
    }

    public void SetNotes(string? notes)
    {
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        Touch();
    }

    private static bool RequiresAsset(TransactionType type) =>
        type is TransactionType.Buy or TransactionType.Sell or TransactionType.Dividend or TransactionType.Coupon;
}
