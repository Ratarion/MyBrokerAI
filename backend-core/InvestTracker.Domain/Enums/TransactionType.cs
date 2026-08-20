namespace InvestTracker.Domain.Enums;

public enum TransactionType
{
    /// <summary>Покупка актива.</summary>
    Buy,

    /// <summary>Продажа актива.</summary>
    Sell,

    /// <summary>Выплата дивидендов.</summary>
    Dividend,

    /// <summary>Выплата купона по облигации.</summary>
    Coupon,

    /// <summary>Пополнение портфеля деньгами.</summary>
    Deposit,

    /// <summary>Вывод денег из портфеля.</summary>
    Withdrawal,

    /// <summary>Комиссия брокера/биржи.</summary>
    Fee,

    /// <summary>Удержание налога.</summary>
    Tax,

    /// <summary>Конвертация валюты внутри портфеля.</summary>
    CurrencyExchange
}
