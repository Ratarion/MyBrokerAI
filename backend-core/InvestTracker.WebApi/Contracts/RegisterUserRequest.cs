namespace InvestTracker.WebApi.Contracts;

public record RegisterUserRequest(string Email, string DisplayName, string Password);
