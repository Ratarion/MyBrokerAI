using InvestTracker.Application.Portfolios.Dtos;
using MediatR;

namespace InvestTracker.Application.Portfolios.Queries.GetPortfolioById;

/// <summary>Детали портфеля вместе со всеми его транзакциями (по убыванию даты исполнения).</summary>
public record GetPortfolioByIdQuery(Guid PortfolioId) : IRequest<PortfolioDetailsDto>;
