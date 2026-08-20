namespace InvestTracker.Domain.Common;

/// <summary>
/// Сущность, для которой отслеживаются даты создания и последнего изменения.
/// </summary>
public abstract class AuditableEntity : BaseEntity
{
    public DateTimeOffset CreatedAt { get; private set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? UpdatedAt { get; private set; }

    protected AuditableEntity()
    {
    }

    protected AuditableEntity(Guid id) : base(id)
    {
    }

    /// <summary>
    /// Помечает сущность как изменённую. Вызывается наследниками при мутации состояния.
    /// </summary>
    protected void Touch() => UpdatedAt = DateTimeOffset.UtcNow;
}
