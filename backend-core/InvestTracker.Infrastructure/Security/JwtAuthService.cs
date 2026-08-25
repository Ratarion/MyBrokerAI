using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using InvestTracker.Application.Auth;
using InvestTracker.Application.Common.Interfaces;
using InvestTracker.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace InvestTracker.Infrastructure.Security;

public sealed class JwtAuthService : IAuthService
{
    private readonly IAppDbContext _db;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IConfiguration _configuration;

    public JwtAuthService(
        IAppDbContext db,
        IPasswordHasher passwordHasher,
        IConfiguration configuration)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _configuration = configuration;
    }

    public async Task<AuthResponse?> LoginAsync(
        string email,
        string password,
        CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        var user = await _db.Users
            .SingleOrDefaultAsync(x => x.Email == normalizedEmail, cancellationToken);

        if (user is null || !_passwordHasher.Verify(password, user.PasswordHash))
            return null;

        return await IssueAsync(user, cancellationToken);
    }

    public async Task<AuthResponse?> RefreshAsync(
        string refreshToken,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
            return null;

        var hash = ComputeSha256(refreshToken);

        var stored = await _db.RefreshTokens
            .Include(x => x.User)
            .SingleOrDefaultAsync(x => x.TokenHash == hash, cancellationToken);

        if (stored is null || !stored.IsActive)
            return null;

        stored.Revoke();

        return await IssueAsync(stored.User, cancellationToken);
    }

    private async Task<AuthResponse> IssueAsync(
        User user,
        CancellationToken cancellationToken)
    {
        var accessMinutes = int.TryParse(_configuration["Jwt:AccessTokenMinutes"], out var configuredAccessMinutes)
            ? configuredAccessMinutes
            : 30;
        var refreshDays = int.TryParse(_configuration["Jwt:RefreshTokenDays"], out var configuredRefreshDays)
            ? configuredRefreshDays
            : 30;

        var accessExpiresAt = DateTimeOffset.UtcNow.AddMinutes(accessMinutes);
        var refreshExpiresAt = DateTimeOffset.UtcNow.AddDays(refreshDays);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email)
        };

        var keyValue = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key is not configured.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyValue));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var jwt = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"] ?? "MyBrokerAI",
            audience: _configuration["Jwt:Audience"] ?? "MyBrokerAI.Client",
            claims: claims,
            expires: accessExpiresAt.UtcDateTime,
            signingCredentials: credentials);

        var accessToken = new JwtSecurityTokenHandler().WriteToken(jwt);

        var rawRefreshToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var refreshEntity = RefreshToken.Create(
            user.Id,
            ComputeSha256(rawRefreshToken),
            refreshExpiresAt);

        _db.RefreshTokens.Add(refreshEntity);
        await _db.SaveChangesAsync(cancellationToken);

        return new AuthResponse(
            user.Id,
            accessToken,
            rawRefreshToken,
            accessExpiresAt,
            refreshExpiresAt);
    }

    private static string ComputeSha256(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
