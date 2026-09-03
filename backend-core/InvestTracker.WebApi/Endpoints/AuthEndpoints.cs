using InvestTracker.Application.Auth;
using InvestTracker.WebApi.Contracts;

namespace InvestTracker.WebApi.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/login", async (
            AuthLoginRequest request,
            IAuthService authService,
            CancellationToken cancellationToken) =>
        {
            var result = await authService.LoginAsync(
                request.Email,
                request.Password,
                cancellationToken);

            return result is null
                ? Results.Unauthorized()
                : Results.Ok(result);
        })
        .AllowAnonymous()
        .WithName("Login")
        .Produces<AuthResponse>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/refresh", async (
            RefreshTokenRequest request,
            IAuthService authService,
            CancellationToken cancellationToken) =>
        {
            var result = await authService.RefreshAsync(
                request.RefreshToken,
                cancellationToken);

            return result is null
                ? Results.Unauthorized()
                : Results.Ok(result);
        })
        .AllowAnonymous()
        .WithName("RefreshToken")
        .Produces<AuthResponse>(StatusCodes.Status200OK)
        .Produces(StatusCodes.Status401Unauthorized);

        return app;
    }
}



