using InvestTracker.Application.Portfolios.Dtos;
using InvestTracker.Domain.Enums;

namespace InvestTracker.Application.Portfolios;

/// <summary>
/// Вычисляет открытые позиции (Holdings) и денежные остатки (CashBalances) портфеля
/// из плоского списка транзакций методом средневзвешенной цены (Weighted Average).
///
/// Метод намеренно чистый (static, без зависимостей) — удобно тестировать.
/// </summary>
public static class PortfolioCalculator
{
    private const decimal MinQuantity = 0.0001m;

    /// <param name="transactions">Транзакции в хронологическом порядке (ASC по ExecutedAt).</param>
    /// <param name="assetsById">Справочник активов для обогащения холдингов тикером и именем.</param>
    public static (
        IReadOnlyCollection<HoldingDto> Holdings,
        IReadOnlyCollection<CashBalanceDto> CashBalances)
        Calculate(
            IEnumerable<TransactionDto> transactions,
            IReadOnlyDictionary<Guid, AssetSummary> assetsById)
    {
        // assetId → (quantity, totalCost, currency)
        var positions = new Dictionary<Guid, PositionAccumulator>();

        // currency → cash amount
        var cash = new Dictionary<Currency, decimal>();

        foreach (var tx in transactions.OrderBy(t => t.ExecutedAt))
        {
            switch (tx.Type)
            {
                case TransactionType.Buy:
                {
                    if (tx.AssetId is not { } assetId) break;

                    var cost = tx.Quantity * tx.PriceAmount + tx.FeeAmount;

                    if (!positions.TryGetValue(assetId, out var pos))
                    {
                        pos = new PositionAccumulator(tx.PriceCurrency);
                        positions[assetId] = pos;
                    }

                    pos.TotalCost += cost;
                    pos.Quantity  += tx.Quantity;

                    // Деньги уходят из кэша (покупка уменьшает остаток)
                    AddCash(cash, tx.PriceCurrency, -(tx.Quantity * tx.PriceAmount + tx.FeeAmount));
                    break;
                }

                case TransactionType.Sell:
                {
                    if (tx.AssetId is not { } assetId) break;

                    if (positions.TryGetValue(assetId, out var pos) && pos.Quantity > 0)
                    {
                        var newQty = pos.Quantity - tx.Quantity;
                        if (newQty <= 0)
                        {
                            pos.Quantity  = 0;
                            pos.TotalCost = 0;
                        }
                        else
                        {
                            // Средняя цена не меняется; TotalCost уменьшается пропорционально
                            pos.TotalCost = pos.TotalCost * (newQty / pos.Quantity);
                            pos.Quantity  = newQty;
                        }
                    }

                    // Деньги приходят в кэш (продажа увеличивает остаток)
                    AddCash(cash, tx.PriceCurrency, tx.Quantity * tx.PriceAmount - tx.FeeAmount);
                    break;
                }

                case TransactionType.Deposit:
                    // Quantity=1, Price=сумма (осознанное решение модели данных)
                    AddCash(cash, tx.PriceCurrency, tx.PriceAmount);
                    break;

                case TransactionType.Withdrawal:
                    AddCash(cash, tx.PriceCurrency, -tx.PriceAmount);
                    break;

                case TransactionType.Dividend:
                case TransactionType.Coupon:
                case TransactionType.Amortization:
                    // Quantity=1, Price=сумма. Зачисляются деньгами (актив не меняется).
                    AddCash(cash, tx.PriceCurrency, tx.PriceAmount);
                    break;

                case TransactionType.Tax:
                case TransactionType.Fee:
                    AddCash(cash, tx.PriceCurrency, -tx.PriceAmount);
                    break;

                case TransactionType.CurrencyExchange:
                    // Пока не поддерживается в расчёте — пропускаем.
                    break;
            }
        }

        var holdings = positions
            .Where(p => p.Value.Quantity >= MinQuantity)
            .Select(p =>
            {
                var avgPrice = p.Value.Quantity > 0
                    ? Math.Round(p.Value.TotalCost / p.Value.Quantity, 6)
                    : 0m;

                assetsById.TryGetValue(p.Key, out var asset);

                return new HoldingDto(
                    AssetId:          p.Key,
                    Ticker:           asset?.Ticker ?? p.Key.ToString()[..8],
                    Name:             asset?.Name   ?? "Неизвестный актив",
                    AssetType:        asset?.AssetType ?? AssetType.Stock,
                    Quantity:         Math.Round(p.Value.Quantity, 6),
                    AvgPrice:         avgPrice,
                    TotalCost:        Math.Round(p.Value.TotalCost, 2),
                    AvgPriceCurrency: p.Value.Currency);
            })
            .OrderBy(h => h.Ticker)
            .ToList();

        var cashBalances = cash
            .Where(c => Math.Abs(c.Value) >= 0.01m)
            .Select(c => new CashBalanceDto(c.Key, Math.Round(c.Value, 2)))
            .OrderBy(c => c.Currency.ToString())
            .ToList();

        return (holdings, cashBalances);
    }

    private static void AddCash(Dictionary<Currency, decimal> cash, Currency currency, decimal amount)
    {
        cash[currency] = cash.GetValueOrDefault(currency) + amount;
    }

    private sealed class PositionAccumulator(Currency currency)
    {
        public decimal Quantity  { get; set; }
        public decimal TotalCost { get; set; }
        public Currency Currency { get; } = currency;
    }
}

/// <summary>Минимальные данные об активе для обогащения холдингов.</summary>
public record AssetSummary(string Ticker, string Name, AssetType AssetType);
