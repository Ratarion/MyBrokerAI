using InvestTracker.Domain.Enums;

namespace InvestTracker.WebApi.Contracts;

public record CreatePortfolioRequest(Guid UserId, string Name, Currency BaseCurrency);
