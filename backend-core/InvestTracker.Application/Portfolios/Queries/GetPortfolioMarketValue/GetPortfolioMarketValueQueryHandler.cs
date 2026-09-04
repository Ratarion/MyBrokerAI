using InvestTracker.Application.Common.Exceptions;
using InvestTracker.Application.Common.Interfaces;
using InvestTracker.Application.Portfolios.Dtos;
using InvestTracker.Domain.Entities;
using InvestTracker.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InvestTracker.Application.Portfolios.Queries.GetPortfolioMarketValue;

public class GetPortfolioMarketValueQueryHandler : IRequestHandler<GetPortfolioMarketValueQuery, PortfolioMarketValueDto>
{
    private readonly IAppDbContext _context;
    private readonly IMoexQuoteProvider _moexQuoteProvider;

    public GetPortfolioMarketValueQueryHandler(
        IAppDbContext context,
        IMoexQuoteProvider moexQuoteProvider)
    {
        _context = context;
        _moexQuoteProvider = moexQuoteProvider;
    }

    public async Task<PortfolioMarketValueDto> Handle(GetPortfolioMarketValueQuery request, CancellationToken cancellationToken)
    {
        var portfolio = await _context.Portfolios
            .Include(p => p.Transactions)
            .FirstOrDefaultAsync(p => p.Id == request.PortfolioId, cancellationToken);

        if (portfolio is null)
        {
            throw new NotFoundException(nameof(Portfolio), request.PortfolioId);
        }

        // Загружаем инфу об активах
        var assetIds = portfolio.Transactions
            .Where(t => t.AssetId.HasValue)
            .Select(t => t.AssetId!.Value)
            .Distinct()
            .ToList();

        var assetsById = await _context.Assets
            .Where(a => assetIds.Contains(a.Id))
            .Select(a => new { a.Id, Ticker = a.Ticker.Symbol, a.Name, a.Type })
            .ToDictionaryAsync(
                a => a.Id,
                a => new AssetSummary(a.Ticker, a.Name, a.Type),
                cancellationToken);

        // Используем существующий калькулятор для получения количества и средней цены
        var transactionsAsc = portfolio.Transactions
            .OrderBy(t => t.ExecutedAt)
            .Select(t =>
            {
                assetsById.TryGetValue(t.AssetId ?? Guid.Empty, out var asset);
                return new TransactionDto(
                    t.Id, t.AssetId, asset?.Ticker, asset?.Name, t.Type, t.Quantity, t.Price.Amount, t.Price.Currency,
                    t.Fee.Amount, t.Fee.Currency, t.ExecutedAt, t.Notes);
            })
            .ToList();

        var (holdingsBase, cashBalances) = PortfolioCalculator.Calculate(transactionsAsc, assetsById);

        // Запрашиваем цены в MOEX
        var instruments = holdingsBase
            .Select(h => (h.Ticker, h.AssetType))
            .Distinct()
            .ToList();

        var quotes = await _moexQuoteProvider.GetCurrentPricesAsync(instruments, cancellationToken);
        var cnyRate = await _moexQuoteProvider.GetCnyRubRateAsync(cancellationToken);

        var marketHoldings = new List<HoldingMarketValueDto>();
        decimal totalMarketValue = 0;
        decimal totalCostForPnl = 0;

        foreach (var h in holdingsBase)
        {
            bool hasQuote = quotes.TryGetValue(h.Ticker, out var quote) && quote is not null && quote.LastPrice > 0;
            decimal lastPrice = 0;
            decimal marketValue = 0;

            decimal costFxRate = h.AvgPriceCurrency switch
            {
                Currency.CNY => cnyRate,
                Currency.USD => 90.0m,
                Currency.EUR => 100.0m,
                _ => 1.0m
            };
            decimal totalCostRub = (h.Quantity * h.AvgPrice) * costFxRate;

            string? nativeCurrency = null;
            decimal? nativePrice = null;

            if (hasQuote && quote is not null)
            {
                lastPrice = quote.LastPrice;
                
                if (h.AssetType == AssetType.Bond)
                {
                    // Для облигаций: (цена в процентах * номинал / 100) + НКД
                    decimal bondPrice = (quote.LastPrice * quote.FaceValue / 100m) + quote.AciRub;

                    decimal fxRate = 1.0m;
                    if (string.Equals(quote.Currency, "CNY", StringComparison.OrdinalIgnoreCase))
                    {
                        fxRate = cnyRate;
                        nativeCurrency = "CNY";
                        nativePrice = bondPrice;
                    }
                    else if (string.Equals(quote.Currency, "USD", StringComparison.OrdinalIgnoreCase))
                    {
                        fxRate = 90.0m;
                        nativeCurrency = "USD";
                        nativePrice = bondPrice;
                    }
                    else if (string.Equals(quote.Currency, "EUR", StringComparison.OrdinalIgnoreCase))
                    {
                        fxRate = 100.0m;
                        nativeCurrency = "EUR";
                        nativePrice = bondPrice;
                    }

                    decimal priceRub = bondPrice * fxRate;
                    marketValue = h.Quantity * priceRub;
                }
                else
                {
                    // Акции, фонды и т.д.
                    marketValue = h.Quantity * quote.LastPrice;
                }

                totalMarketValue += marketValue;
                totalCostForPnl += totalCostRub;
            }
            else
            {
                // Защитный fallback: если MOEX не вернул котировку (выходной/сбой/бумага не торгуется),
                // используем цену покупки (балансовую стоимость), чтобы общая стоимость портфеля не падала до 0!
                lastPrice = h.AvgPrice;
                marketValue = totalCostRub;
                totalMarketValue += marketValue;
                totalCostForPnl += totalCostRub;
            }

            decimal unrealizedPnl = hasQuote ? (marketValue - totalCostRub) : 0;
            decimal unrealizedPnlPct = (hasQuote && totalCostRub > 0) 
                ? (unrealizedPnl / totalCostRub) * 100m 
                : 0;

            marketHoldings.Add(new HoldingMarketValueDto(
                h.AssetId, h.Ticker, h.Name, h.AssetType,
                h.Quantity, h.AvgPrice, h.AvgPriceCurrency,
                hasQuote, lastPrice, marketValue, totalCostRub,
                unrealizedPnl, Math.Round(unrealizedPnlPct, 2),
                nativeCurrency, nativePrice));
        }

        // Добавляем кэш к общей стоимости портфеля
        foreach (var cash in cashBalances)
        {
            if (cash.Currency == Currency.RUB)
            {
                totalMarketValue += cash.Amount;
                totalCostForPnl += cash.Amount;
            }
            else if (cash.Currency == Currency.CNY)
            {
                totalMarketValue += cash.Amount * cnyRate;
                totalCostForPnl += cash.Amount * cnyRate;
            }
        }

        decimal totalUnrealizedPnl = totalMarketValue - totalCostForPnl;
        decimal totalUnrealizedPnlPct = totalCostForPnl > 0 
            ? (totalUnrealizedPnl / totalCostForPnl) * 100m 
            : 0;

        return new PortfolioMarketValueDto(
            Math.Round(totalMarketValue, 2),
            Math.Round(totalCostForPnl, 2),
            Math.Round(totalUnrealizedPnl, 2),
            Math.Round(totalUnrealizedPnlPct, 2),
            marketHoldings,
            DateTimeOffset.UtcNow,
            Math.Round(cnyRate, 4));
    }
}
