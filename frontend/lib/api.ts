export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5030";

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
  | "Amortization"
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
  Amortization: "Амортизация / Погашение",
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
  assetTicker?: string;
  assetName?: string;
  type: TransactionType;
  quantity: number;
  priceAmount: number;
  priceCurrency: Currency;
  feeAmount: number;
  feeCurrency: Currency;
  executedAt: string;
  notes: string | null;
}

export type AssetType = "Stock" | "Bond" | "Etf" | "Currency" | "Other";

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  Stock: "Акция",
  Bond: "Облигация",
  Etf: "ETF/Фонд",
  Currency: "Валюта",
  Other: "Прочее",
};

export interface HoldingDto {
  assetId: string;
  ticker: string;
  name: string;
  assetType: AssetType;
  quantity: number;
  avgPrice: number;
  totalCost?: number;
  avgPriceCurrency: Currency;
}

export interface CashBalanceDto {
  currency: Currency;
  amount: number;
}

export interface PortfolioDetails {
  id: string;
  userId: string;
  name: string;
  baseCurrency: Currency;
  createdAt: string;
  transactions: TransactionDto[];
  holdings: HoldingDto[];
  cashBalances: CashBalanceDto[];
}

export interface ImportReportResult {
  transactionsImported: number;
  transactionsSkippedAsDuplicate: number;
  assetsCreated: number;
  unrecognizedDescriptions: string[];
}

export interface ProblemDetailsBody {
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

export interface MoexCandle {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
}

export const MOEX_POPULAR_TICKERS = [
  { ticker: "IMOEX", label: "Индекс МосБиржи" },
  { ticker: "SBER", label: "Сбербанк" },
  { ticker: "GAZP", label: "Газпром" },
  { ticker: "LKOH", label: "Лукойл" },
  { ticker: "YDEX", label: "Яндекс" },
  { ticker: "GMKN", label: "Норникель" },
] as const;

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

export interface HoldingMarketValueDto {
  assetId: string;
  ticker: string;
  name: string;
  assetType: AssetType;
  quantity: number;
  avgPrice: number;
  currency: Currency;
  hasQuote: boolean;
  lastPrice: number;
  marketValue: number;
  totalCost: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
}

export interface PortfolioMarketValueDto {
  totalMarketValue: number;
  totalCost: number;
  totalUnrealizedPnl: number;
  totalUnrealizedPnlPct: number;
  holdings: HoldingMarketValueDto[];
  fetchedAt: string;
  cnyRate?: number;
}
