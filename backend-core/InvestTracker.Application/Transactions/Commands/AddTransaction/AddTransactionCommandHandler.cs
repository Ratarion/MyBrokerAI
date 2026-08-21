using InvestTracker.Application.Common.Exceptions;
using InvestTracker.Application.Common.Interfaces;
using InvestTracker.Domain.Entities;
using InvestTracker.Domain.ValueObjects;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InvestTracker.Application.Transactions.Commands.AddTransaction;

public class AddTransactionCommandHandler : IRequestHandler<AddTransactionCommand, Guid>
{
    private readonly IAppDbContext _context;

    public AddTransactionCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(AddTransactionCommand request, CancellationToken cancellationToken)
    {
        var portfolio = await _context.Portfolios
            .FirstOrDefaultAsync(p => p.Id == request.PortfolioId, cancellationToken);

        if (portfolio is null)
        {
            throw new NotFoundException(nameof(Portfolio), request.PortfolioId);
        }

        if (request.AssetId is { } assetId)
        {
            var assetExists = await _context.Assets
                .AnyAsync(a => a.Id == assetId, cancellationToken);

            if (!assetExists)
            {
                throw new NotFoundException(nameof(Asset), assetId);
            }
        }

        // Транзакция создаётся и добавляется через агрегат Portfolio,
        // а не напрямую — так соблюдаются инварианты (см. Transaction.Create).
        var transaction = portfolio.AddTransaction(
            request.AssetId,
            request.Type,
            request.Quantity,
            new Money(request.Price, request.PriceCurrency),
            new Money(request.Fee, request.FeeCurrency),
            request.ExecutedAt);

        await _context.SaveChangesAsync(cancellationToken);

        return transaction.Id;
    }
}
