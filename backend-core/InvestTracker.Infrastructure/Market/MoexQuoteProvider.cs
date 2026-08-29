using System.Text.Json;
using InvestTracker.Application.Common.Interfaces;
using InvestTracker.Application.Market.Dtos;

namespace InvestTracker.Infrastructure.Market;

/// <summary>
/// Клиент публичного ISS API Московской биржи (https://iss.moex.com/) — без ключа, бесплатно.
/// Документация: https://iss.moex.com/iss/reference/.
/// </summary>
public class MoexQuoteProvider : IMoexQuoteProvider
{
    private readonly HttpClient _httpClient;

    public MoexQuoteProvider(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    public async Task<IReadOnlyCollection<MoexCandleDto>> GetCandlesAsync(
        string ticker,
        DateOnly from,
        DateOnly till,
        CancellationToken cancellationToken = default)
    {
        var normalizedTicker = ticker.Trim().ToUpperInvariant();
        var (engine, market, board) = ResolveMarket(normalizedTicker);

        var url =
            $"iss/engines/{engine}/markets/{market}/boards/{board}/securities/{normalizedTicker}/candles.json" +
            $"?from={from:yyyy-MM-dd}&till={till:yyyy-MM-dd}&interval=24&iss.meta=off&iss.only=candles";

        using var response = await _httpClient.GetAsync(url, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

        if (!document.RootElement.TryGetProperty("candles", out var candlesElement))
        {
            return [];
        }

        var columns = candlesElement.GetProperty("columns")
            .EnumerateArray()
            .Select(c => c.GetString()!)
            .ToList();

        var openIndex = columns.IndexOf("open");
        var closeIndex = columns.IndexOf("close");
        var highIndex = columns.IndexOf("high");
        var lowIndex = columns.IndexOf("low");
        var volumeIndex = columns.IndexOf("volume");
        var beginIndex = columns.IndexOf("begin");

        if (openIndex < 0 || closeIndex < 0 || highIndex < 0 || lowIndex < 0 || volumeIndex < 0 || beginIndex < 0)
        {
            // Формат ответа ISS неожиданно изменился — лучше вернуть пусто, чем упасть с IndexOutOfRange.
            return [];
        }

        var result = new List<MoexCandleDto>();

        foreach (var row in candlesElement.GetProperty("data").EnumerateArray())
        {
            var beginRaw = row[beginIndex].GetString();

            // MOEX отдаёт "2026-08-20 00:00:00" — берём только дату.
            if (beginRaw is null || !DateOnly.TryParse(beginRaw.Split(' ')[0], out var date))
            {
                continue;
            }

            result.Add(new MoexCandleDto(
                date,
                row[openIndex].GetDecimal(),
                row[closeIndex].GetDecimal(),
                row[highIndex].GetDecimal(),
                row[lowIndex].GetDecimal(),
                row[volumeIndex].GetInt64()));
        }

        return result;
    }

    private static (string Engine, string Market, string Board) ResolveMarket(string ticker) =>
        ticker switch
        {
            "IMOEX" or "RTSI" or "MOEXBC" => ("stock", "index", "SNDX"),
            _ => ("stock", "shares", "TQBR")
        };
}
