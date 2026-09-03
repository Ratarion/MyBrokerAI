namespace InvestTracker.Application.Market.Dtos;

/// <summary>
/// Текущая котировка инструмента с МосБиржи.
/// Для акций: FaceValue=1, AciRub=0, LastPrice — цена в рублях.
/// Для облигаций: LastPrice — цена в % от номинала (напр. 98.5),
///   FaceValue — номинал в рублях (обычно 1000), AciRub — НКД в рублях.
/// Рыночная цена облигации = LastPrice * FaceValue / 100 + AciRub.
/// </summary>
public record MoexCurrentQuoteDto(
    string Ticker,
    decimal LastPrice,
    decimal FaceValue,
    decimal AciRub);
