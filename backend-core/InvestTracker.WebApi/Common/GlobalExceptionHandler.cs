using InvestTracker.Domain.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace InvestTracker.WebApi.Common;

/// <summary>
/// Единая точка преобразования исключений Application/Domain в HTTP-ответы (ProblemDetails).
/// Регистрируется через builder.Services.AddExceptionHandler и app.UseExceptionHandler() в Program.cs.
/// </summary>
public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var (statusCode, problemDetails) = exception switch
        {
            Application.Common.Exceptions.ValidationException validationException => (
                StatusCodes.Status400BadRequest,
                (ProblemDetails)new ValidationProblemDetails(validationException.Errors)
                {
                    Title = "Ошибка валидации.",
                    Status = StatusCodes.Status400BadRequest
                }),

            Application.Common.Exceptions.NotFoundException notFoundException => (
                StatusCodes.Status404NotFound,
                new ProblemDetails
                {
                    Title = "Не найдено.",
                    Detail = notFoundException.Message,
                    Status = StatusCodes.Status404NotFound
                }),

            DomainException domainException => (
                StatusCodes.Status400BadRequest,
                new ProblemDetails
                {
                    Title = "Нарушение бизнес-правила.",
                    Detail = domainException.Message,
                    Status = StatusCodes.Status400BadRequest
                }),

            _ => (
                StatusCodes.Status500InternalServerError,
                new ProblemDetails
                {
                    Title = "Внутренняя ошибка сервера.",
                    Status = StatusCodes.Status500InternalServerError
                })
        };

        if (statusCode == StatusCodes.Status500InternalServerError)
        {
            _logger.LogError(exception, "Необработанное исключение при обработке {Path}", httpContext.Request.Path);
        }

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(problemDetails, cancellationToken);

        return true;
    }
}
