using InvestTracker.Application.Portfolios.Dtos;
using MediatR;

namespace InvestTracker.Application.Portfolios.Queries.GetPortfolioMarketValue;

public record GetPortfolioMarketValueQuery(Guid PortfolioId) : IRequest<PortfolioMarketValueDto>;
