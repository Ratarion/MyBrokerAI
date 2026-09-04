using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using HtmlAgilityPack;
using InvestTracker.Application.Common.Interfaces;
using InvestTracker.Application.Imports.Dtos;
using InvestTracker.Domain.Enums;

namespace InvestTracker.Infrastructure.Parsers.Sber;

/// <summary>
/// Парсер HTML-отчёта брокера СберИнвестиций.
/// Разбирает 2 таблицы: "Движение денежных средств за период" (деньги) и
/// "Сделки купли/продажи ценных бумаг" (сделки). Структура проверена на реальном отчёте.
/// </summary>
public partial class SberHtmlReportParser : IBrokerReportParser
{
    public ParsedBrokerReport Parse(Stream fileContent)
    {
        var document = new HtmlDocument();
        document.Load(fileContent, System.Text.Encoding.UTF8);

        var securities = new Dictionary<string, ParsedSecurity>(StringComparer.OrdinalIgnoreCase);
        var trades = new List<ParsedTrade>();
        var cashFlows = new List<ParsedCashFlow>();
        var unrecognized = new List<string>();

        ParseSecuritiesDictionary(document, securities);
        ParseTrades(document, securities, trades);
        ParseCashFlows(document, securities, cashFlows, unrecognized);

        return new ParsedBrokerReport(securities.Values.ToList(), trades, cashFlows, unrecognized);
    }

    private static void ParseSecuritiesDictionary(HtmlDocument document, Dictionary<string, ParsedSecurity> securities)
    {
        var table = document.DocumentNode.SelectSingleNode(
            "//p[contains(., 'Справочник Ценных Бумаг')]/following-sibling::table[1]");

        var rows = table?.SelectNodes(".//tr");
        if (rows is null) return;

        foreach (var row in rows)
        {
            var cells = row.SelectNodes("./td");
            // Наименование, Код актива, ISIN, Эмитент, Вид, Гос. рег. номер
            if (cells is null || cells.Count < 3) continue;

            var name = Text(cells[0]);
            var code = Text(cells[1]).ToUpperInvariant();
            var isin = Text(cells[2]).ToUpperInvariant();

            if (string.IsNullOrWhiteSpace(code) || code == "КОД АКТИВА") continue;

            securities.TryAdd(code, new ParsedSecurity(code, name));
            // Если код не совпадает с ISIN, полезно добавить и по ISIN, 
            // чтобы можно было находить бумаги по fallbackCode = ISIN
            if (!string.IsNullOrWhiteSpace(isin) && isin != code)
            {
                securities.TryAdd(isin, new ParsedSecurity(isin, name));
            }
        }
    }

    private static void ParseTrades(
        HtmlDocument document,
        Dictionary<string, ParsedSecurity> securities,
        List<ParsedTrade> trades)
    {
        var table = document.DocumentNode.SelectSingleNode(
            "//p[contains(., 'Сделки купли/продажи ценных бумаг')]/following-sibling::table[1]");

        var rows = table?.SelectNodes(".//tr");
        if (rows is null)
        {
            return;
        }

        foreach (var row in rows)
        {
            var cells = row.SelectNodes("./td");

            // Реальная строка сделки — ровно 16 колонок. Заголовок, номера колонок и
            // строка "Площадка: ..." (colspan) под это условие не попадают — и хорошо.
            if (cells is null || cells.Count != 16)
            {
                continue;
            }

            if (!DateOnly.TryParseExact(Text(cells[0]), "dd.MM.yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            {
                continue;
            }

            TimeOnly.TryParseExact(Text(cells[2]), "HH:mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.None, out var time);

            var name = Text(cells[3]);
            var code = Text(cells[4]).ToUpperInvariant();
            var currency = ParseCurrency(Text(cells[5]));
            var side = Text(cells[6]);
            var quantity = ParseDecimal(Text(cells[7]));
            var amount = ParseDecimal(Text(cells[9]));
            var nkd = ParseDecimal(Text(cells[10]));
            var price = quantity > 0 ? (amount + nkd) / quantity : ParseDecimal(Text(cells[8]));
            var brokerFee = ParseDecimal(Text(cells[11]));
            var exchangeFee = ParseDecimal(Text(cells[12]));
            var tradeNumber = Text(cells[13]);
            var status = Text(cells[15]);

            if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(tradeNumber))
            {
                continue;
            }

            securities.TryAdd(code, new ParsedSecurity(code, name));

            var type = side.StartsWith("Покуп", StringComparison.OrdinalIgnoreCase)
                ? TransactionType.Buy
                : TransactionType.Sell;

            trades.Add(new ParsedTrade(
                new DateTimeOffset(date.ToDateTime(time), TimeSpan.Zero),
                code,
                type,
                quantity,
                price,
                brokerFee + exchangeFee,
                currency,
                $"sber-trade:{tradeNumber}",
                status is "" or "ЗИ" ? null : $"Статус у брокера: {status}"));
        }
    }

    private static void ParseCashFlows(
        HtmlDocument document,
        Dictionary<string, ParsedSecurity> securities,
        List<ParsedCashFlow> cashFlows,
        List<string> unrecognized)
    {
        var table = document.DocumentNode.SelectSingleNode(
            "//p[contains(., 'Движение денежных средств за период')]/following-sibling::table[1]");

        var rows = table?.SelectNodes(".//tr");
        if (rows is null)
        {
            return;
        }

        var sequence = 0;

        foreach (var row in rows)
        {
            var cells = row.SelectNodes("./td");
            if (cells is null || cells.Count != 6)
            {
                continue;
            }

            if (!DateOnly.TryParseExact(Text(cells[0]), "dd.MM.yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            {
                continue; // заголовок / строка номеров колонок
            }

            var description = Text(cells[2]);
            var currency = ParseCurrency(Text(cells[3]));
            var credit = ParseDecimal(Text(cells[4]));
            var debit = ParseDecimal(Text(cells[5]));
            var amount = credit > 0 ? credit : debit;

            var (result, type, securityName, fallbackCode) = Classify(description);

            if (result == ClassificationResult.Skip)
            {
                // "Сделка от ...", "Комиссия Биржи/Брокера от ..." — уже учтены в таблице сделок.
                continue;
            }

            sequence++;
            var externalId = $"sber-cash:{date:yyyy-MM-dd}:{sequence}";
            var executedAt = new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);

            if (result == ClassificationResult.Unrecognized)
            {
                unrecognized.Add(description);
                // Не пропускаем — записываем как пополнение/списание, чтобы баланс сходился.
                // Пользователь увидит описание в списке предупреждений.
                type = credit > 0 ? TransactionType.Deposit : TransactionType.Withdrawal;
            }

            string? securityCode = null;

            if (securityName is not null)
            {
                var match = securities.Values.FirstOrDefault(s =>
                    string.Equals(s.Name, securityName, StringComparison.OrdinalIgnoreCase));

                if (match is not null)
                {
                    securityCode = match.Code;
                }
                else if (fallbackCode is not null)
                {
                    // Имя не встречалось в таблице сделок (бумага уже была куплена до начала
                    // периода отчёта) — используем ISIN, который брокер дал прямо в описании.
                    securityCode = fallbackCode.ToUpperInvariant();
                    securities.TryAdd(securityCode, new ParsedSecurity(securityCode, securityName));
                }
                else if (Regex.IsMatch(securityName, @"^\d{5}$"))
                {
                    // ОФЗ, например 26226. Брокер пишет название без "ОФЗ". Пытаемся найти по подстроке.
                    var ofzMatch = securities.Values.FirstOrDefault(s => s.Name.Contains(securityName));
                    if (ofzMatch is not null)
                    {
                        securityCode = ofzMatch.Code;
                    }
                }
                else if (securityName.EndsWith(" ETF", StringComparison.OrdinalIgnoreCase))
                {
                    // Эвристика: Сбербанк иногда пишет "Выплата дохода по паям/ису FLOW ETF. Налог удержан."
                    // Тикер фонда здесь — FLOW. Проверяем, есть ли такой код.
                    var possibleCode = securityName.Substring(0, securityName.Length - 4).Trim().ToUpperInvariant();
                    if (securities.TryGetValue(possibleCode, out var foundAsset))
                    {
                        securityCode = foundAsset.Code;
                    }
                    else
                    {
                        // Если в Справочнике Ценных Бумаг нет, всё равно пробуем передать код тикера
                        securityCode = possibleCode;
                    }
                }
            }

            cashFlows.Add(new ParsedCashFlow(executedAt, type, amount, currency, securityCode, externalId, description));
        }
    }

    private enum ClassificationResult
    {
        Recognized,
        Skip,
        Unrecognized
    }

    private static (ClassificationResult Result, TransactionType Type, string? SecurityName, string? FallbackCode) Classify(
        string description)
    {
        var m = DividendRegex().Match(description);
        if (m.Success)
        {
            return (ClassificationResult.Recognized, TransactionType.Dividend, m.Groups["name"].Value.Trim(), null);
        }

        m = DividendWithIsinRegex().Match(description);
        if (m.Success)
        {
            return (ClassificationResult.Recognized, TransactionType.Dividend, m.Groups["name"].Value.Trim(), m.Groups["isin"].Value);
        }

        m = FundDistributionWithIsinRegex().Match(description);
        if (m.Success)
        {
            return (ClassificationResult.Recognized, TransactionType.Dividend, m.Groups["name"].Value.Trim(), m.Groups["isin"].Value);
        }

        m = FundDistributionRegex().Match(description);
        if (m.Success)
        {
            return (ClassificationResult.Recognized, TransactionType.Dividend, m.Groups["name"].Value.Trim(), null);
        }

        m = CouponRegex().Match(description);
        if (m.Success)
        {
            return (ClassificationResult.Recognized, TransactionType.Coupon, m.Groups["name"].Value.Trim(), null);
        }

        m = CouponDepositRegex().Match(description);
        if (m.Success)
        {
            return (ClassificationResult.Recognized, TransactionType.Coupon, m.Groups["name"].Value.Trim(), null);
        }

        if (DepositRegex().IsMatch(description) || PromoRegex().IsMatch(description))
        {
            return (ClassificationResult.Recognized, TransactionType.Deposit, null, null);
        }

        m = AmortizationRegex().Match(description);
        if (m.Success)
        {
            var isinGroup = m.Groups["isin"];
            var isin = isinGroup.Success ? isinGroup.Value : null;
            return (ClassificationResult.Recognized, TransactionType.Amortization, m.Groups["name"].Value.Trim(), isin);
        }

        if (TaxRegex().IsMatch(description))
        {
            return (ClassificationResult.Recognized, TransactionType.Tax, null, null);
        }

        if (WithdrawalRegex().IsMatch(description))
        {
            return (ClassificationResult.Recognized, TransactionType.Withdrawal, null, null);
        }

        if (SkipRegex().IsMatch(description))
        {
            return (ClassificationResult.Skip, default, null, null);
        }

        return (ClassificationResult.Unrecognized, default, null, null);
    }

    private static string Text(HtmlNode node) => WebUtility.HtmlDecode(node.InnerText).Replace('\u00A0', ' ').Trim();

    private static decimal ParseDecimal(string text)
    {
        var cleaned = text.Replace(" ", "").Trim();
        return string.IsNullOrEmpty(cleaned) ? 0m : decimal.Parse(cleaned, CultureInfo.InvariantCulture);
    }

    private static Currency ParseCurrency(string text) =>
        Enum.TryParse<Currency>(text.Trim(), true, out var currency) ? currency : Currency.RUB;

    [GeneratedRegex(@"^Выплата дивидендов (?<name>.+?)(\. Налог удержан\.)?$")]
    private static partial Regex DividendRegex();

    [GeneratedRegex(@"^Дивиденды (?<name>.+?); ISIN (?<isin>[A-Z0-9]+);")]
    private static partial Regex DividendWithIsinRegex();

    [GeneratedRegex(@"^Выплата (дохода )?по паям/ису (?<name>.+?);\s*ISIN\s+(?<isin>[A-Z0-9]+);")]
    private static partial Regex FundDistributionWithIsinRegex();

    [GeneratedRegex(@"^Выплата (дохода )?по паям/ису (?<name>.+?)(\. Налог удержан\.?)?$")]
    private static partial Regex FundDistributionRegex();

    [GeneratedRegex(@"^Выплата купонов (?<name>.+?), номер купона \d+$")]
    private static partial Regex CouponRegex();

    [GeneratedRegex(@"^Зачисление д/с \(купон \d+ по (?<name>.+?)\)$")]
    private static partial Regex CouponDepositRegex();

    [GeneratedRegex(@"^Зачисление д/с(\s*\(.*\))?$")]
    private static partial Regex DepositRegex();

    [GeneratedRegex(@"^Выплата участнику акции")]
    private static partial Regex PromoRegex();

    [GeneratedRegex(@"^Списание д/с\. Налог")]
    private static partial Regex TaxRegex();

    [GeneratedRegex(@"^Списание д/с$")]
    private static partial Regex WithdrawalRegex();

    [GeneratedRegex(@"^(Сделка от |Комиссия Биржи от |Комиссия Брокера.* от )")]
    private static partial Regex SkipRegex();

    [GeneratedRegex(@"^(?:Погашение номинальной стоимости|Амортизация|Выплата амортизации|Погашение облигаций) (?<name>.+?)(?:; ISIN (?<isin>[A-Z0-9]+))?")]
    private static partial Regex AmortizationRegex();
}
