using InvestTracker.Application.Common.Exceptions;
using InvestTracker.Application.Common.Interfaces;
using InvestTracker.Application.Portfolios.Dtos;
using InvestTracker.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InvestTracker.Application.Portfolios.Queries.GetPortfolioById;

public class GetPortfolioByIdQueryHandler : IRequestHandler<GetPortfolioByIdQuery, PortfolioDetailsDto>
{
    private readonly IAppDbContext _context;

    public GetPortfolioByIdQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<PortfolioDetailsDto> Handle(GetPortfolioByIdQuery request, CancellationToken cancellationToken)
    {
        var portfolio = await _context.Portfolios
            .Where(p => p.Id == request.PortfolioId)
            .Select(p => new
            {
                p.Id,
                p.UserId,
                p.Name,
                p.BaseCurrency,
                p.CreatedAt,
                Transactions = p.Transactions
                    .OrderByDescending(t => t.ExecutedAt)
                    .Select(t => new TransactionDto(
                        t.Id,
                        t.AssetId,
                        t.Type,
                        t.Quantity,
                        t.Price.Amount,
                        t.Price.Currency,
                        t.Fee.Amount,
                        t.Fee.Currency,
                        t.ExecutedAt,
                        t.Notes))
                    .ToList(),
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (portfolio is null)
        {
            throw new NotFoundException(nameof(Portfolio), request.PortfolioId);
        }

        // Собираем справочник активов, которые встречаются в транзакциях портфеля
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

        // Вычисляем открытые позиции и денежный баланс методом средневзвешенной цены.
        // Для расчёта нужны транзакции в хронологическом порядке (ASC).
        var transactionsAsc = portfolio.Transactions
            .OrderBy(t => t.ExecutedAt)
            .ToList();

        var (holdings, cashBalances) = PortfolioCalculator.Calculate(transactionsAsc, assetsById);

        return new PortfolioDetailsDto(
            portfolio.Id,
            portfolio.UserId,
            portfolio.Name,
            portfolio.BaseCurrency,
            portfolio.CreatedAt,
            portfolio.Transactions,
            holdings,
            cashBalances);
    }
}
