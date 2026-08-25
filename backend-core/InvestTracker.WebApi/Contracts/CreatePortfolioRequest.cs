using InvestTracker.Domain.Enums;

namespace InvestTracker.WebApi.Contracts;

public record CreatePortfolioRequest(string Name, Currency BaseCurrency);
