using InvestTracker.Domain.Common;
using InvestTracker.Domain.Enums;
using InvestTracker.Domain.Exceptions;
using InvestTracker.Domain.ValueObjects;

namespace InvestTracker.Domain.Entities;

/// <summary>
/// Инвестиционный портфель пользователя. Агрегат-корень для транзакций:
/// транзакции создаются и добавляются только через методы портфеля,
/// что гарантирует соблюдение инвариантов на уровне агрегата.
/// </summary>
public class Portfolio : AuditableEntity
{
    private readonly List<Transaction> _transactions = [];

    public Guid UserId { get; private set; }

    public string Name { get; private set; } = null!;

    public Currency BaseCurrency { get; private set; }

    public IReadOnlyCollection<Transaction> Transactions => _transactions.AsReadOnly();

    private Portfolio()
    {
        // Для EF Core.
    }

    private Portfolio(Guid id, Guid userId, string name, Currency baseCurrency) : base(id)
    {
        UserId = userId;
        Name = name;
        BaseCurrency = baseCurrency;
    }

    public static Portfolio Create(Guid userId, string name, Currency baseCurrency)
    {
        if (userId == Guid.Empty)
        {
            throw new DomainException("Портфель должен принадлежать пользователю.");
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainException("Название портфеля не может быть пустым.");
        }

        return new Portfolio(Guid.NewGuid(), userId, name.Trim(), baseCurrency);
    }

    public Transaction AddTransaction(
        Guid? assetId,
        TransactionType type,
        decimal quantity,
        Money price,
        Money fee,
        DateTimeOffset executedAt)
    {
        var transaction = Transaction.Create(Id, assetId, type, quantity, price, fee, executedAt);
        _transactions.Add(transaction);
        Touch();
        return transaction;
    }

    public void Rename(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainException("Название портфеля не может быть пустым.");
        }

        Name = name.Trim();
        Touch();
    }
}
