using InvestTracker.Domain.Common;
using InvestTracker.Domain.Exceptions;

namespace InvestTracker.Domain.Entities;

public class RefreshToken : BaseEntity
{
    public Guid UserId { get; private set; }
    public User User { get; private set; } = null!;

    public string TokenHash { get; private set; } = null!;
    public DateTimeOffset ExpiresAt { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public DateTimeOffset? RevokedAt { get; private set; }

    public bool IsActive => RevokedAt is null && ExpiresAt > DateTimeOffset.UtcNow;

    private RefreshToken()
    {
    }

    public static RefreshToken Create(
        Guid userId,
        string tokenHash,
        DateTimeOffset expiresAt)
    {
        if (userId == Guid.Empty)
            throw new DomainException("UserId refresh token не может быть пустым.");

        if (string.IsNullOrWhiteSpace(tokenHash))
            throw new DomainException("Хэш refresh token не может быть пустым.");

        if (expiresAt <= DateTimeOffset.UtcNow)
            throw new DomainException("Refresh token должен иметь срок действия в будущем.");

        return new RefreshToken
        {
            UserId = userId,
            TokenHash = tokenHash,
            ExpiresAt = expiresAt,
            CreatedAt = DateTimeOffset.UtcNow
        };
    }

    public void Revoke()
    {
        if (RevokedAt is null)
            RevokedAt = DateTimeOffset.UtcNow;
    }
}
