using InvestTracker.Domain.Common;
using InvestTracker.Domain.Enums;
using InvestTracker.Domain.Exceptions;

namespace InvestTracker.Domain.Entities;

/// <summary>
/// Пользователь системы. Агрегат-корень для своих портфелей.
/// </summary>
public class User : AuditableEntity
{
    private readonly List<Portfolio> _portfolios = [];

    public string Email { get; private set; } = null!;

    public string DisplayName { get; private set; } = null!;

    /// <summary>Хэш пароля. Сам пароль в домене никогда не хранится и не обрабатывается.</summary>
    public string PasswordHash { get; private set; } = null!;

    public IReadOnlyCollection<Portfolio> Portfolios => _portfolios.AsReadOnly();

    private User()
    {
        // Для EF Core.
    }

    private User(Guid id, string email, string displayName, string passwordHash) : base(id)
    {
        Email = email;
        DisplayName = displayName;
        PasswordHash = passwordHash;
    }

    public static User Create(string email, string displayName, string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            throw new DomainException("Email не может быть пустым.");
        }

        if (string.IsNullOrWhiteSpace(displayName))
        {
            throw new DomainException("Имя пользователя не может быть пустым.");
        }

        if (string.IsNullOrWhiteSpace(passwordHash))
        {
            throw new DomainException("Хэш пароля не может быть пустым.");
        }

        return new User(Guid.NewGuid(), email.Trim().ToLowerInvariant(), displayName.Trim(), passwordHash);
    }

    public Portfolio AddPortfolio(string name, Currency baseCurrency)
    {
        var portfolio = Portfolio.Create(Id, name, baseCurrency);
        _portfolios.Add(portfolio);
        Touch();
        return portfolio;
    }

    public void Rename(string displayName)
    {
        if (string.IsNullOrWhiteSpace(displayName))
        {
            throw new DomainException("Имя пользователя не может быть пустым.");
        }

        DisplayName = displayName.Trim();
        Touch();
    }
}
