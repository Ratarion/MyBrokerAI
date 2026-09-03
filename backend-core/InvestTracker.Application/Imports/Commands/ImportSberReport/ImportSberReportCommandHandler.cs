using InvestTracker.Application.Common.Exceptions;
using InvestTracker.Application.Common.Interfaces;
using InvestTracker.Application.Imports.Dtos;
using InvestTracker.Domain.Entities;
using InvestTracker.Domain.Enums;
using InvestTracker.Domain.Exceptions;
using InvestTracker.Domain.ValueObjects;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace InvestTracker.Application.Imports.Commands.ImportSberReport;

public class ImportSberReportCommandHandler : IRequestHandler<ImportSberReportCommand, ImportReportResultDto>
{
    private readonly IAppDbContext _context;
    private readonly IBrokerReportParser _parser;

    public ImportSberReportCommandHandler(IAppDbContext context, IBrokerReportParser parser)
    {
        _context = context;
        _parser = parser;
    }

    public async Task<ImportReportResultDto> Handle(ImportSberReportCommand request, CancellationToken cancellationToken)
    {
        var portfolio = await _context.Portfolios
            .FirstOrDefaultAsync(p => p.Id == request.PortfolioId, cancellationToken);

        if (portfolio is null)
        {
            throw new NotFoundException(nameof(Portfolio), request.PortfolioId);
        }

        ParsedBrokerReport report;
        try
        {
            report = _parser.Parse(request.FileContent);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            // Файл не тот, что ожидали (не отчёт Сбера, либо формат отчёта изменился) —
            // это ошибка входных данных, а не наша, поэтому 400, а не 500.
            throw new DomainException($"Не удалось разобрать файл как отчёт брокера: {ex.Message}");
        }

        // Активы подгружаем целиком в память и сверяем на клиенте — у личного портфеля их
        // реалистично десятки-сотни, специально не усложняем LINQ-запрос ради этого масштаба.
        var allAssets = await _context.Assets.ToListAsync(cancellationToken);
        var assetsByCode = allAssets.ToDictionary(a => a.Ticker.Symbol, a => a, StringComparer.OrdinalIgnoreCase);

        var assetsCreated = 0;

        foreach (var security in report.Securities)
        {
            var normalizedCode = security.Code.Trim().ToUpperInvariant();

            if (assetsByCode.ContainsKey(normalizedCode))
            {
                continue;
            }

            // ISIN-подобный код (12 симв., начинается с 2 латинских букв) — считаем облигацией,
            // иначе — акцией/фондом. Эвристика: ETF/фонды так не отличить от акций, поправить
            // можно будет только вручную (редактирования актива пока нет в UI).
            var assetType = LooksLikeIsin(normalizedCode) ? AssetType.Bond : AssetType.Stock;

            var asset = Asset.Create(normalizedCode, security.Name, assetType, portfolio.BaseCurrency);
            _context.Assets.Add(asset);
            assetsByCode[normalizedCode] = asset;
            assetsCreated++;
        }

        // Уже импортированные операции этого портфеля — чтобы не задвоить при повторном импорте
        // того же (или пересекающегося по датам) отчёта.
        var existingExternalIds = portfolio.Transactions
            .Where(t => t.ExternalId != null)
            .Select(t => t.ExternalId!)
            .ToHashSet();

        var imported = 0;
        var skippedDuplicates = 0;

        foreach (var trade in report.Trades)
        {
            if (!existingExternalIds.Add(trade.ExternalId))
            {
                skippedDuplicates++;
                continue;
            }

            if (!assetsByCode.TryGetValue(trade.SecurityCode.Trim().ToUpperInvariant(), out var asset))
            {
                continue; // не должно случаться: Securities строятся из тех же сделок
            }

            portfolio.AddTransaction(
                asset.Id,
                trade.Type,
                trade.Quantity,
                new Money(trade.Price, trade.Currency),
                new Money(trade.Fee, trade.Currency),
                trade.ExecutedAt,
                trade.ExternalId);

            imported++;
        }

        // Предупреждения из хендлера (дополняют parser.UnrecognizedDescriptions)
        var handlerWarnings = new List<string>();

        foreach (var cashFlow in report.CashFlows)
        {
            if (!existingExternalIds.Add(cashFlow.ExternalId))
            {
                skippedDuplicates++;
                continue;
            }

            Guid? assetId = null;
            if (cashFlow.SecurityCode is { } code
                && assetsByCode.TryGetValue(code.Trim().ToUpperInvariant(), out var asset))
            {
                assetId = asset.Id;
            }

            var effectiveType = cashFlow.Type;

            // Дивиденд/купон без привязки к активу нарушает доменный инвариант.
            // Такое бывает, когда бумага куплена до начала периода отчёта и в описании нет ISIN —
            // мы не можем определить, к какому активу относится выплата.
            // Решение: записываем как Deposit (деньги приходят корректно), а описание
            // добавляем в предупреждения — пользователь видит, что именно не привязалось.
            if (assetId is null
                && cashFlow.Type is TransactionType.Dividend or TransactionType.Coupon)
            {
                effectiveType = TransactionType.Deposit;
                handlerWarnings.Add(
                    $"Не удалось привязать к активу — записано как пополнение: «{cashFlow.Description}»");
            }

            // У чисто денежных операций (Deposit/Withdrawal/Tax/Dividend/Coupon) в модели нет
            // отдельного поля "сумма" — используем Quantity=1, Price=сумма операции. Осознанный
            // выбор в рамках текущей схемы Transaction (стоимость = Price × Quantity), не баг.
            portfolio.AddTransaction(
                assetId,
                effectiveType,
                quantity: 1,
                price: new Money(cashFlow.Amount, cashFlow.Currency),
                fee: Money.Zero(cashFlow.Currency),
                cashFlow.ExecutedAt,
                cashFlow.ExternalId);

            imported++;
        }

        await _context.SaveChangesAsync(cancellationToken);

        var allUnrecognized = report.UnrecognizedDescriptions
            .Concat(handlerWarnings)
            .ToList();

        return new ImportReportResultDto(imported, skippedDuplicates, assetsCreated, allUnrecognized);
    }

    private static bool LooksLikeIsin(string code) =>
        code.Length == 12 && char.IsLetter(code[0]) && char.IsLetter(code[1]);
}
