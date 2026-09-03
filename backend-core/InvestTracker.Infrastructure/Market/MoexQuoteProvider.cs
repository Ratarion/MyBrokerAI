using System.Text.Json;
using InvestTracker.Application.Common.Interfaces;
using InvestTracker.Application.Market.Dtos;
using InvestTracker.Domain.Enums;

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
            return [];
        }

        var result = new List<MoexCandleDto>();

        foreach (var row in candlesElement.GetProperty("data").EnumerateArray())
        {
            var beginRaw = row[beginIndex].GetString();

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

    public async Task<IReadOnlyDictionary<string, MoexCurrentQuoteDto>> GetCurrentPricesAsync(
        IEnumerable<(string Ticker, AssetType AssetType)> instruments,
        CancellationToken cancellationToken = default)
    {
        var result = new Dictionary<string, MoexCurrentQuoteDto>(StringComparer.OrdinalIgnoreCase);
        var instrumentList = instruments.ToList();
        
        if (instrumentList.Count == 0) return result;

        var stocks = instrumentList.Where(i => i.AssetType is AssetType.Stock or AssetType.Etf).Select(i => i.Ticker).ToList();
        var bonds = instrumentList.Where(i => i.AssetType is AssetType.Bond).Select(i => i.Ticker).ToList();

        if (stocks.Count > 0)
        {
            // Акции (TQBR)
            string securitiesParam = string.Join(",", stocks);
            var url = $"iss/engines/stock/markets/shares/boards/TQBR/securities.json?securities={securitiesParam}&iss.meta=off&iss.only=securities,marketdata";
            await FetchAndParseMarketData(url, false, result, cancellationToken);
        }

        if (bonds.Count > 0)
        {
            // ОФЗ (TQOB)
            string securitiesParam = string.Join(",", bonds);
            var tqobUrl = $"iss/engines/stock/markets/bonds/boards/TQOB/securities.json?securities={securitiesParam}&iss.meta=off&iss.only=securities,marketdata";
            await FetchAndParseMarketData(tqobUrl, true, result, cancellationToken);
            
            // Корпоративные облигации (TQCB). MOEX не вернет ошибку, если в запросе будут тикеры, которых нет на TQCB.
            var tqcbUrl = $"iss/engines/stock/markets/bonds/boards/TQCB/securities.json?securities={securitiesParam}&iss.meta=off&iss.only=securities,marketdata";
            await FetchAndParseMarketData(tqcbUrl, true, result, cancellationToken);
        }

        return result;
    }

    private async Task FetchAndParseMarketData(string url, bool isBond, Dictionary<string, MoexCurrentQuoteDto> result, CancellationToken cancellationToken)
    {
        try
        {
            using var response = await _httpClient.GetAsync(url, cancellationToken);
            if (!response.IsSuccessStatusCode) return;

            await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

            var prices = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);

            if (document.RootElement.TryGetProperty("marketdata", out var mdElement))
            {
                var columns = mdElement.GetProperty("columns").EnumerateArray().Select(c => c.GetString()!).ToList();
                var secIdIdx = columns.IndexOf("SECID");
                var lastIdx = columns.IndexOf("LAST");

                if (secIdIdx >= 0 && lastIdx >= 0)
                {
                    foreach (var row in mdElement.GetProperty("data").EnumerateArray())
                    {
                        var ticker = row[secIdIdx].GetString();
                        if (string.IsNullOrEmpty(ticker) || row[lastIdx].ValueKind == JsonValueKind.Null) continue;
                        prices[ticker] = row[lastIdx].GetDecimal();
                    }
                }
            }

            if (document.RootElement.TryGetProperty("securities", out var secElement))
            {
                var columns = secElement.GetProperty("columns").EnumerateArray().Select(c => c.GetString()!).ToList();
                var secIdIdx = columns.IndexOf("SECID");
                var faceValueIdx = isBond ? columns.IndexOf("FACEVALUE") : -1;
                var aciIdx = isBond ? columns.IndexOf("ACCRUEDINT") : -1;

                if (secIdIdx >= 0)
                {
                    foreach (var row in secElement.GetProperty("data").EnumerateArray())
                    {
                        var ticker = row[secIdIdx].GetString();
                        if (string.IsNullOrEmpty(ticker) || !prices.TryGetValue(ticker, out var lastPrice)) continue;

                        decimal faceValue = 1m;
                        decimal aci = 0m;

                        if (isBond && faceValueIdx >= 0 && row[faceValueIdx].ValueKind != JsonValueKind.Null)
                        {
                            faceValue = row[faceValueIdx].GetDecimal();
                        }

                        if (isBond && aciIdx >= 0 && row[aciIdx].ValueKind != JsonValueKind.Null)
                        {
                            aci = row[aciIdx].GetDecimal();
                        }

                        result[ticker] = new MoexCurrentQuoteDto(ticker, lastPrice, faceValue, aci);
                    }
                }
            }
        }
        catch (Exception)
        {
            // MOEX иногда возвращает 503 или рвет соединение. Глотаем ошибку.
        }
    }

    private static (string Engine, string Market, string Board) ResolveMarket(string ticker) =>
        ticker switch
        {
            "IMOEX" or "RTSI" or "MOEXBC" => ("stock", "index", "SNDX"),
            _ => ("stock", "shares", "TQBR")
        };
}
