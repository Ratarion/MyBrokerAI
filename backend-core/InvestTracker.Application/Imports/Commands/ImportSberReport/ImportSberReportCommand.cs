using InvestTracker.Application.Imports.Dtos;
using MediatR;

namespace InvestTracker.Application.Imports.Commands.ImportSberReport;

public record ImportSberReportCommand(Guid PortfolioId, Stream FileContent) : IRequest<ImportReportResultDto>;
