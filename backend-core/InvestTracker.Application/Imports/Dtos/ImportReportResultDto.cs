namespace InvestTracker.Application.Imports.Dtos;

public record ImportReportResultDto(
    int TransactionsImported,
    int TransactionsSkippedAsDuplicate,
    int AssetsCreated,
    IReadOnlyCollection<string> UnrecognizedDescriptions);
