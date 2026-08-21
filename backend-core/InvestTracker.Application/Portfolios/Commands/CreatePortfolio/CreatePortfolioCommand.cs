using InvestTracker.Domain.Enums;
using MediatR;

namespace InvestTracker.Application.Portfolios.Commands.CreatePortfolio;

/// <summary>Создаёт новый портфель для существующего пользователя. Возвращает Id портфеля.</summary>
public record CreatePortfolioCommand(Guid UserId, string Name, Currency BaseCurrency) : IRequest<Guid>;
