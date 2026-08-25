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
            .Select(p => new PortfolioDetailsDto(
                p.Id,
                p.UserId,
                p.Name,
                p.BaseCurrency,
                p.CreatedAt,
                p.Transactions
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
                    .ToList()))
            .FirstOrDefaultAsync(cancellationToken);

        if (portfolio is null)
        {
            throw new NotFoundException(nameof(Portfolio), request.PortfolioId);
        }

        return portfolio;
    }
}
