namespace InvestTracker.Application.Common.Exceptions;

/// <summary>
/// Запрошенное действие конфликтует с текущим состоянием (например, email уже занят).
/// WebApi должен маппить это исключение на HTTP 409.
/// </summary>
public class ConflictException : Exception
{
    public ConflictException(string message) : base(message)
    {
    }
}
