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
            .Include(p => p.Transactions)
            .FirstOrDefaultAsync(p => p.Id == request.PortfolioId, cancellationToken);

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

        var transactionsDto = portfolio.Transactions
            .OrderByDescending(t => t.ExecutedAt)
            .Select(t =>
            {
                assetsById.TryGetValue(t.AssetId ?? Guid.Empty, out var asset);
                return new TransactionDto(
                    t.Id,
                    t.AssetId,
                    asset?.Ticker,
                    asset?.Name,
                    t.Type,
                    t.Quantity,
                    t.Price.Amount,
                    t.Price.Currency,
                    t.Fee.Amount,
                    t.Fee.Currency,
                    t.ExecutedAt,
                    t.Notes);
            })
            .ToList();

        // Вычисляем открытые позиции и денежный баланс методом средневзвешенной цены.
        // Для расчёта нужны транзакции в хронологическом порядке (ASC).
        var transactionsAsc = transactionsDto.OrderBy(t => t.ExecutedAt).ToList();

        var (holdings, cashBalances) = PortfolioCalculator.Calculate(transactionsAsc, assetsById);

        return new PortfolioDetailsDto(
            portfolio.Id,
            portfolio.UserId,
            portfolio.Name,
            portfolio.BaseCurrency,
            portfolio.CreatedAt,
            transactionsDto,
            holdings,
            cashBalances);
    }
}
