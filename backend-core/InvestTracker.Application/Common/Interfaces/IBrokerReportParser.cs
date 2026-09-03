using InvestTracker.Application.Imports.Dtos;

namespace InvestTracker.Application.Common.Interfaces;

public interface IBrokerReportParser
{
    ParsedBrokerReport Parse(Stream fileContent);
}
