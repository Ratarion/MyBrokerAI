using FluentValidation;

namespace InvestTracker.Application.Portfolios.Queries.GetPortfolios;

public class GetPortfoliosQueryValidator : AbstractValidator<GetPortfoliosQuery>
{
    public GetPortfoliosQueryValidator()
    {
        RuleFor(x => x.UserId).NotEmpty();
    }
}
