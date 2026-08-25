using InvestTracker.Application.Common.Interfaces;
using InvestTracker.Application.Portfolios.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InvestTracker.Application.Portfolios.Queries.GetPortfolios;

public class GetPortfoliosQueryHandler
    : IRequestHandler<GetPortfoliosQuery, IReadOnlyCollection<PortfolioListItemDto>>
{
    private readonly IAppDbContext _context;

    public GetPortfoliosQueryHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyCollection<PortfolioListItemDto>> Handle(
        GetPortfoliosQuery request,
        CancellationToken cancellationToken)
    {
        return await _context.Portfolios
            .Where(p => p.UserId == request.UserId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PortfolioListItemDto(
                p.Id,
                p.Name,
                p.BaseCurrency,
                p.Transactions.Count,
                p.CreatedAt))
            .ToListAsync(cancellationToken);
    }
}
