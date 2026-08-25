export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5030";

// Id пользователя, засеянного вручную в БД (см. seed-test-user.sql в корне репозитория).
// Оставлен как дефолт для быстрых тестов — после регистрации своего пользователя
// подставится его настоящий id (через ?userId=... на главной).
export const SEED_USER_ID = "11111111-1111-1111-1111-111111111111";

export const CURRENCIES = ["RUB", "USD", "EUR", "GBP", "CNY"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type TransactionType =
  | "Buy"
  | "Sell"
  | "Dividend"
  | "Coupon"
  | "Deposit"
  | "Withdrawal"
  | "Fee"
  | "Tax"
  | "CurrencyExchange";

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  Buy: "Покупка",
  Sell: "Продажа",
  Dividend: "Дивиденды",
  Coupon: "Купон",
  Deposit: "Пополнение",
  Withdrawal: "Вывод",
  Fee: "Комиссия",
  Tax: "Налог",
  CurrencyExchange: "Конвертация валюты",
};

export interface PortfolioListItem {
  id: string;
  name: string;
  baseCurrency: Currency;
  transactionsCount: number;
  createdAt: string;
}

export interface TransactionDto {
  id: string;
  assetId: string | null;
  type: TransactionType;
  quantity: number;
  priceAmount: number;
  priceCurrency: Currency;
  feeAmount: number;
  feeCurrency: Currency;
  executedAt: string;
  notes: string | null;
}

export interface PortfolioDetails {
  id: string;
  userId: string;
  name: string;
  baseCurrency: Currency;
  createdAt: string;
  transactions: TransactionDto[];
}

export interface ProblemDetailsBody {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

export function formatValidationErrors(errors?: Record<string, string[]>): string | undefined {
  if (!errors) return undefined;
  return Object.values(errors).flat().join(" ");
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
