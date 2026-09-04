using InvestTracker.Application.Common.Exceptions;
using InvestTracker.Application.Common.Interfaces;
using InvestTracker.Application.Portfolios.Dtos;
using InvestTracker.Domain.Entities;
using InvestTracker.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InvestTracker.Application.Portfolios.Queries.GetPortfolioPayouts;

public class GetPortfolioPayoutsQueryHandler : IRequestHandler<GetPortfolioPayoutsQuery, PortfolioPayoutsScheduleDto>
{
    private readonly IAppDbContext _context;
    private readonly IMoexQuoteProvider _moexQuoteProvider;

    public GetPortfolioPayoutsQueryHandler(
        IAppDbContext context,
        IMoexQuoteProvider moexQuoteProvider)
    {
        _context = context;
        _moexQuoteProvider = moexQuoteProvider;
    }

    public async Task<PortfolioPayoutsScheduleDto> Handle(GetPortfolioPayoutsQuery request, CancellationToken cancellationToken)
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

        // Рассчитываем текущие позиции
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

        var (holdings, _) = PortfolioCalculator.Calculate(transactionsAsc, assetsById);
        var holdingsByTicker = holdings.ToDictionary(h => h.Ticker, StringComparer.OrdinalIgnoreCase);

        var resultPayouts = new List<PortfolioPayoutItemDto>();
        var now = DateTimeOffset.UtcNow;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        // 1. Исторические выплаты из отчёта брокера
        foreach (var tx in portfolio.Transactions)
        {
            if (tx.Type is not (TransactionType.Dividend or TransactionType.Coupon or TransactionType.Amortization or TransactionType.Tax))
            {
                continue;
            }

            assetsById.TryGetValue(tx.AssetId ?? Guid.Empty, out var asset);
            var isTax = tx.Type == TransactionType.Tax;
            var isAmortization = tx.Type == TransactionType.Amortization;

            var status = isTax
                ? "Удержан"
                : isAmortization
                    ? "Погашения/амортизация"
                    : "Выплачены";

            resultPayouts.Add(new PortfolioPayoutItemDto(
                Id: tx.Id.ToString(),
                AssetId: tx.AssetId,
                AssetTicker: asset?.Ticker,
                AssetName: asset?.Name ?? (isTax ? "Налог" : "Выплата"),
                Type: tx.Type.ToString(),
                Amount: tx.Price.Amount,
                Currency: tx.Price.Currency.ToString(),
                ExecutedAt: tx.ExecutedAt,
                RecordDate: null,
                Status: status,
                Calculation: null,
                IsFuture: false
            ));
        }

        // 2. Будущие выплаты по облигациям из биржевого расписания MOEX (bondization)
        var bondHoldings = holdings
            .Where(h => h.AssetType == AssetType.Bond && h.Quantity > 0)
            .ToList();

        foreach (var bond in bondHoldings)
        {
            var moexPayouts = await _moexQuoteProvider.GetBondPayoutsAsync(bond.Ticker, cancellationToken);
            if (moexPayouts.Count == 0) continue;

            foreach (var p in moexPayouts)
            {
                // Берём только будущие выплаты (начиная с сегодняшнего дня)
                if (p.Date < today) continue;

                var totalAmount = Math.Round(p.Value * bond.Quantity, 2);
                if (totalAmount <= 0) continue;

                var execDateTime = new DateTimeOffset(p.Date.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
                DateTimeOffset? recDateTime = p.RecordDate.HasValue
                    ? new DateTimeOffset(p.RecordDate.Value.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero)
                    : null;

                var isAmort = p.Type == "Amortization";

                resultPayouts.Add(new PortfolioPayoutItemDto(
                    Id: $"moex-{bond.Ticker}-{p.Type}-{p.Date:yyyyMMdd}",
                    AssetId: bond.AssetId,
                    AssetTicker: bond.Ticker,
                    AssetName: bond.Name,
                    Type: p.Type,
                    Amount: totalAmount,
                    Currency: p.Currency,
                    ExecutedAt: execDateTime,
                    RecordDate: recDateTime,
                    Status: "Объявлены",
                    Calculation: $"{bond.Quantity} × {p.Value:N2} ₽",
                    IsFuture: true
                ));
            }
        }

        // 3. Для акций и фондов (где нет жесткого биржевого календаря на год вперед):
        // если бумага есть в портфеле и за последние 12 месяцев по ней был дивиденд,
        // проецируем TTM выплату со статусом "Прогноз", если на эту дату еще нет объявленной выплаты
        var oneYearAgo = now.AddYears(-1);
        var pastDividends = transactionsAsc
            .Where(t => t.Type == TransactionType.Dividend && t.ExecutedAt >= oneYearAgo && t.ExecutedAt <= now && t.AssetTicker is not null)
            .ToList();

        foreach (var div in pastDividends)
        {
            if (!holdingsByTicker.TryGetValue(div.AssetTicker!, out var currentHolding) || currentHolding.Quantity <= 0)
            {
                continue;
            }

            var futureDate = div.ExecutedAt.AddYears(1);
            if (futureDate <= now) continue;

            // Проверяем, нет ли уже выплаты по этой бумаге на эту же дату
            bool alreadyExists = resultPayouts.Any(r =>
                r.AssetTicker == div.AssetTicker &&
                r.ExecutedAt.Date == futureDate.Date);

            if (!alreadyExists)
            {
                resultPayouts.Add(new PortfolioPayoutItemDto(
                    Id: $"forecast-{div.Id}",
                    AssetId: div.AssetId,
                    AssetTicker: div.AssetTicker,
                    AssetName: div.AssetName ?? div.AssetTicker,
                    Type: "Dividend",
                    Amount: div.PriceAmount,
                    Currency: div.PriceCurrency.ToString(),
                    ExecutedAt: futureDate,
                    RecordDate: null,
                    Status: "Прогноз",
                    Calculation: $"1 × {div.PriceAmount:N2} ₽",
                    IsFuture: true
                ));
            }
        }

        // Сортировка: новые/будущие первыми
        var sorted = resultPayouts
            .OrderByDescending(p => p.ExecutedAt)
            .ToList();

        // Расчёт итогов на ближайшие 12 месяцев вперед
        var nextYear = now.AddYears(1);
        var upcomingYearPayouts = sorted
            .Where(p => p.ExecutedAt >= now && p.ExecutedAt <= nextYear && p.Type != "Tax")
            .Sum(p => p.Amount);

        var avgPerMonth = upcomingYearPayouts / 12m;

        return new PortfolioPayoutsScheduleDto(
            sorted,
            Math.Round(upcomingYearPayouts, 2),
            Math.Round(avgPerMonth, 2));
    }
}
