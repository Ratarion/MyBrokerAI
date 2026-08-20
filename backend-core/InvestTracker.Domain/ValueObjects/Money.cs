using InvestTracker.Domain.Enums;
using InvestTracker.Domain.Exceptions;

namespace InvestTracker.Domain.ValueObjects;

/// <summary>
/// Неизменяемый денежный value object: сумма + валюта.
/// Арифметика допустима только между суммами в одной валюте.
/// </summary>
public readonly record struct Money
{
    public decimal Amount { get; }

    public Currency Currency { get; }

    public Money(decimal amount, Currency currency)
    {
        Amount = amount;
        Currency = currency;
    }

    public static Money Zero(Currency currency) => new(0m, currency);

    public static Money operator +(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return new Money(left.Amount + right.Amount, left.Currency);
    }

    public static Money operator -(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return new Money(left.Amount - right.Amount, left.Currency);
    }

    public static Money operator *(Money money, decimal factor) => new(money.Amount * factor, money.Currency);

    private static void EnsureSameCurrency(Money left, Money right)
    {
        if (left.Currency != right.Currency)
        {
            throw new DomainException(
                $"Нельзя выполнить операцию над суммами в разных валютах: {left.Currency} и {right.Currency}.");
        }
    }

    public override string ToString() => $"{Amount:0.####} {Currency}";
}
