using InvestTracker.Application.Auth;
using InvestTracker.Application.Portfolios.Commands.CreatePortfolio;
using InvestTracker.Application.Users.Commands.RegisterUser;
using InvestTracker.Domain.Enums;
using InvestTracker.WebApi.Contracts;
using MediatR;

namespace InvestTracker.WebApi.Endpoints;

public static class UserEndpoints
{
    public static IEndpointRouteBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users").WithTags("Users");

        group.MapPost("/", async (
            RegisterUserRequest request,
            ISender sender,
            IAuthService authService,
            CancellationToken cancellationToken) =>
        {
            var userId = await sender.Send(
                new RegisterUserCommand(request.Email, request.DisplayName, request.Password),
                cancellationToken);

            await sender.Send(
                new CreatePortfolioCommand(userId, "Основной", Currency.RUB),
                cancellationToken);

            var auth = await authService.LoginAsync(request.Email, request.Password, cancellationToken);
            if (auth is null)
            {
                return Results.Problem(
                    title: "Не удалось авторизовать только что созданного пользователя.",
                    statusCode: StatusCodes.Status500InternalServerError);
            }

            return Results.Ok(auth);
        })
        .WithName("RegisterUser")
        .WithSummary("Зарегистрировать пользователя, создать основной портфель и сразу авторизовать")
        .Produces<AuthResponse>(StatusCodes.Status200OK)
        .ProducesValidationProblem()
        .ProducesProblem(StatusCodes.Status409Conflict);

        return app;
    }
}
