using FluentValidation;

namespace InvestTracker.Application.Portfolios.Commands.CreatePortfolio;

public class CreatePortfolioCommandValidator : AbstractValidator<CreatePortfolioCommand>
{
    public CreatePortfolioCommandValidator()
    {
        RuleFor(x => x.UserId)
            .NotEmpty();

        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.BaseCurrency)
            .IsInEnum();
    }
}
