using InvestTracker.Application.Common.Exceptions;
using InvestTracker.Application.Common.Interfaces;
using InvestTracker.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InvestTracker.Application.Users.Commands.RegisterUser;

public class RegisterUserCommandHandler : IRequestHandler<RegisterUserCommand, Guid>
{
    private readonly IAppDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public RegisterUserCommandHandler(IAppDbContext context, IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task<Guid> Handle(RegisterUserCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var emailTaken = await _context.Users
            .AnyAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (emailTaken)
        {
            throw new ConflictException($"Пользователь с email '{normalizedEmail}' уже зарегистрирован.");
        }

        var passwordHash = _passwordHasher.Hash(request.Password);
        var user = User.Create(request.Email, request.DisplayName, passwordHash);

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        return user.Id;
    }
}
