using InvestTracker.Application.Common.Exceptions;
using InvestTracker.Application.Common.Interfaces;
using InvestTracker.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InvestTracker.Application.Portfolios.Commands.CreatePortfolio;

public class CreatePortfolioCommandHandler : IRequestHandler<CreatePortfolioCommand, Guid>
{
    private readonly IAppDbContext _context;

    public CreatePortfolioCommandHandler(IAppDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(CreatePortfolioCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user is null)
        {
            throw new NotFoundException(nameof(User), request.UserId);
        }

        // Создание портфеля — ответственность агрегата User, а не хендлера:
        // это гарантирует, что портфель не может существовать без владельца.
        var portfolio = user.AddPortfolio(request.Name, request.BaseCurrency);

        _context.Portfolios.Add(portfolio);

        await _context.SaveChangesAsync(cancellationToken);

        return portfolio.Id;
    }
}
