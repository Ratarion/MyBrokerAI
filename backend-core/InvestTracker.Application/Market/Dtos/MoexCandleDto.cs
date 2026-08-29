namespace InvestTracker.Application.Market.Dtos;

public record MoexCandleDto(
    DateOnly Date,
    decimal Open,
    decimal Close,
    decimal High,
    decimal Low,
    long Volume);
