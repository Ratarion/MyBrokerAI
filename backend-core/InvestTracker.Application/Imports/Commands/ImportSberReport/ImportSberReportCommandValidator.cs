using FluentValidation;

namespace InvestTracker.Application.Imports.Commands.ImportSberReport;

public class ImportSberReportCommandValidator : AbstractValidator<ImportSberReportCommand>
{
    public ImportSberReportCommandValidator()
    {
        RuleFor(x => x.PortfolioId).NotEmpty();
        RuleFor(x => x.FileContent).NotNull();
    }
}
