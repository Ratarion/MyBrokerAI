using InvestTracker.Application.Portfolios.Dtos;
using MediatR;

namespace InvestTracker.Application.Portfolios.Queries.GetPortfolios;

/// <summary>Список портфелей пользователя (без транзакций — только сводка).</summary>
public record GetPortfoliosQuery(Guid UserId) : IRequest<IReadOnlyCollection<PortfolioListItemDto>>;
