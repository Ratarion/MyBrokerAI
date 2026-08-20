namespace InvestTracker.Domain.Exceptions;

/// <summary>
/// Исключение, сигнализирующее о нарушении инварианта домена
/// (например, попытка создать сущность с невалидными данными).
/// </summary>
public class DomainException : Exception
{
    public DomainException(string message) : base(message)
    {
    }

    public DomainException(string message, Exception innerException) : base(message, innerException)
    {
    }
}
