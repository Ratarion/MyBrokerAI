using System.Security.Claims;

namespace InvestTracker.WebApi.Common;

public static class HttpContextExtensions
{
    public static Guid GetRequiredUserId(this HttpContext context)
    {
        var value = context.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? context.User.FindFirstValue("sub");

        if (!Guid.TryParse(value, out var userId) || userId == Guid.Empty)
            throw new UnauthorizedAccessException("Не удалось определить текущего пользователя.");

        return userId;
    }
}
