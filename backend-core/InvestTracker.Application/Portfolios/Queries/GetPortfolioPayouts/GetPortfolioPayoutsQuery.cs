using InvestTracker.Application.Portfolios.Dtos;
using MediatR;

namespace InvestTracker.Application.Portfolios.Queries.GetPortfolioPayouts;

public record GetPortfolioPayoutsQuery(Guid PortfolioId) : IRequest<PortfolioPayoutsScheduleDto>;
