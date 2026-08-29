using FluentValidation;

namespace InvestTracker.Application.Market.Queries.GetMoexCandles;

public class GetMoexCandlesQueryValidator : AbstractValidator<GetMoexCandlesQuery>
{
    public GetMoexCandlesQueryValidator()
    {
        RuleFor(x => x.Ticker)
            .NotEmpty()
            .MaximumLength(20);

        RuleFor(x => x.From)
            .LessThanOrEqualTo(x => x.Till)
            .WithMessage("Дата начала должна быть не позже даты окончания.");

        RuleFor(x => x)
            .Must(x => x.Till.DayNumber - x.From.DayNumber <= 3660)
            .WithMessage("Слишком большой диапазон дат (максимум ~10 лет).");
    }
}
