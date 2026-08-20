namespace InvestTracker.Domain.Common;

/// <summary>
/// Базовый класс для всех сущностей домена.
/// Равенство сущностей определяется по Id, а не по значениям полей.
/// </summary>
public abstract class BaseEntity
{
    public Guid Id { get; protected set; } = Guid.NewGuid();

    protected BaseEntity()
    {
    }

    protected BaseEntity(Guid id)
    {
        if (id == Guid.Empty)
        {
            throw new ArgumentException("Id сущности не может быть пустым.", nameof(id));
        }

        Id = id;
    }

    public override bool Equals(object? obj)
    {
        if (obj is not BaseEntity other)
        {
            return false;
        }

        if (ReferenceEquals(this, other))
        {
            return true;
        }

        if (GetType() != other.GetType())
        {
            return false;
        }

        return Id == other.Id;
    }

    public override int GetHashCode() => HashCode.Combine(GetType(), Id);

    public static bool operator ==(BaseEntity? left, BaseEntity? right) =>
        left is null ? right is null : left.Equals(right);

    public static bool operator !=(BaseEntity? left, BaseEntity? right) => !(left == right);
}
