using InvestTracker.Domain.Common;
using InvestTracker.Domain.Enums;
using InvestTracker.Domain.Exceptions;
using InvestTracker.Domain.ValueObjects;

namespace InvestTracker.Domain.Entities;

/// <summary>
/// Торгуемый актив (акция, облигация, ETF и т.д.).
/// Является отдельным агрегатом — на него ссылаются по Id, а не по объекту.
/// </summary>
public class Asset : AuditableEntity
{
    public Ticker Ticker { get; private set; }

    public string Name { get; private set; } = null!;

    public AssetType Type { get; private set; }

    public Currency Currency { get; private set; }

    /// <summary>Международный идентификационный код ценной бумаги (опционально).</summary>
    public string? Isin { get; private set; }

    private Asset()
    {
        // Для EF Core.
    }

    private Asset(Guid id, Ticker ticker, string name, AssetType type, Currency currency, string? isin)
        : base(id)
    {
        Ticker = ticker;
        Name = name;
        Type = type;
        Currency = currency;
        Isin = isin;
    }

    public static Asset Create(string ticker, string name, AssetType type, Currency currency, string? isin = null)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainException("Название актива не может быть пустым.");
        }

        return new Asset(Guid.NewGuid(), new Ticker(ticker), name.Trim(), type, currency, NormalizeIsin(isin));
    }

    public void Rename(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainException("Название актива не может быть пустым.");
        }

        Name = name.Trim();
        Touch();
    }

    private static string? NormalizeIsin(string? isin) =>
        string.IsNullOrWhiteSpace(isin) ? null : isin.Trim().ToUpperInvariant();
}
