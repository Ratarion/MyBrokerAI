using FluentValidation.Results;

namespace InvestTracker.Application.Common.Exceptions;

/// <summary>
/// Выбрасывается ValidationBehaviour, когда FluentValidation находит ошибки в команде/запросе.
/// WebApi должен маппить это исключение на HTTP 400 с деталями по полям.
/// </summary>
public class ValidationException : Exception
{
    public ValidationException()
        : base("Обнаружена одна или несколько ошибок валидации.")
    {
        Errors = new Dictionary<string, string[]>();
    }

    public ValidationException(IEnumerable<ValidationFailure> failures) : this()
    {
        Errors = failures
            .GroupBy(failure => failure.PropertyName, failure => failure.ErrorMessage)
            .ToDictionary(group => group.Key, group => group.ToArray());
    }

    public IDictionary<string, string[]> Errors { get; }
}
