namespace InvestTracker.Domain.ValueObjects;

/// <summary>
/// Биржевой тикер актива (например, "SBER", "AAPL").
/// Всегда хранится в нормализованном виде — без пробелов, в верхнем регистре.
/// </summary>
public readonly record struct Ticker
{
    public string Symbol { get; }

    public Ticker(string symbol)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            throw new ArgumentException("Тикер не может быть пустым.", nameof(symbol));
        }

        Symbol = symbol.Trim().ToUpperInvariant();
    }

    public override string ToString() => Symbol;

    public static implicit operator string(Ticker ticker) => ticker.Symbol;
}
