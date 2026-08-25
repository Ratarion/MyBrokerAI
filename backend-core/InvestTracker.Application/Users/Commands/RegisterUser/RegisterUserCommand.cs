using MediatR;

namespace InvestTracker.Application.Users.Commands.RegisterUser;

public record RegisterUserCommand(string Email, string DisplayName, string Password) : IRequest<Guid>;
