using FluentValidation;
using InvestTracker.Domain.Enums;

namespace InvestTracker.Application.Transactions.Commands.AddTransaction;

public class AddTransactionCommandValidator : AbstractValidator<AddTransactionCommand>
{
    private static readonly TransactionType[] TypesRequiringAsset =
    [
        TransactionType.Buy,
        TransactionType.Sell,
        TransactionType.Dividend,
        TransactionType.Coupon
    ];

    public AddTransactionCommandValidator()
    {
        RuleFor(x => x.PortfolioId)
            .NotEmpty();

        RuleFor(x => x.Type)
            .IsInEnum();

        RuleFor(x => x.Quantity)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.Price)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.Fee)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.PriceCurrency)
            .IsInEnum();

        RuleFor(x => x.FeeCurrency)
            .IsInEnum();

        RuleFor(x => x.AssetId)
            .NotEmpty()
            .When(x => TypesRequiringAsset.Contains(x.Type))
            .WithMessage("Для этой операции необходимо указать актив.");
    }
}
