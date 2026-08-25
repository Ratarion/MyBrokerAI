using InvestTracker.Application.Users.Commands.RegisterUser;
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
            CancellationToken cancellationToken) =>
        {
            var command = new RegisterUserCommand(request.Email, request.DisplayName, request.Password);
            var userId = await sender.Send(command, cancellationToken);

            return Results.Created($"/api/users/{userId}", new { id = userId });
        })
        .WithName("RegisterUser")
        .WithSummary("Зарегистрировать нового пользователя")
        .Produces(StatusCodes.Status201Created)
        .ProducesValidationProblem()
        .ProducesProblem(StatusCodes.Status409Conflict);

        return app;
    }
}
