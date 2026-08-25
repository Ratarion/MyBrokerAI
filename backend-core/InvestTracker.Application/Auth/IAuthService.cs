namespace InvestTracker.Application.Auth;

public interface IAuthService
{
    Task<AuthResponse?> LoginAsync(
        string email,
        string password,
        CancellationToken cancellationToken = default);

    Task<AuthResponse?> RefreshAsync(
        string refreshToken,
        CancellationToken cancellationToken = default);
}
