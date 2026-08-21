namespace InvestTracker.Application.Common.Exceptions;

/// <summary>
/// Сущность не найдена по указанному идентификатору.
/// WebApi должен маппить это исключение на HTTP 404.
/// </summary>
public class NotFoundException : Exception
{
    public NotFoundException()
    {
    }

    public NotFoundException(string message) : base(message)
    {
    }

    public NotFoundException(string name, object key)
        : base($"Сущность \"{name}\" с ключом ({key}) не найдена.")
    {
    }
}
