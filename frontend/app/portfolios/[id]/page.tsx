"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import {
  ASSET_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  formatDateTime,
  type AssetType,
  type CashBalanceDto,
  type HoldingDto,
  type ImportReportResult,
  type PortfolioDetails,
  type PortfolioMarketValueDto,
  type HoldingMarketValueDto,
  type ProblemDetailsBody,
} from "@/lib/api";
import { useAuth, useAuthFetch } from "@/lib/AuthContext";

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; portfolio: PortfolioDetails }
  | { status: "not-found" }
  | { status: "error"; message: string };

type ImportState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: ImportReportResult }
  | { status: "error"; message: string };

type MarketState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "loaded"; data: PortfolioMarketValueDto }
  | { status: "error" };

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function getAssetCategory(h: { assetType: AssetType; name?: string; ticker?: string }): "Stock" | "Bond" | "Etf" | "Currency" {
  if (h.assetType === "Bond") return "Bond";
  if (h.assetType === "Etf") return "Etf";
  if (h.assetType === "Currency") return "Currency";

  const nameLower = (h.name || "").toLowerCase();
  const tickerLower = (h.ticker || "").toLowerCase();
  if (
    nameLower.includes("фонд") ||
    nameLower.includes("etf") ||
    nameLower.includes("бпиф") ||
    nameLower.includes("пай") ||
    nameLower.includes("доход") ||
    nameLower.includes("золото") ||
    ["flow", "safe", "sbbc", "sbfr", "sbgd", "sbmm", "sbmx", "sbrb", "sbsc", "spay", "akgd", "amnr", "tglld"].includes(tickerLower)
  ) {
    return "Etf";
  }

  return "Stock";
}

export default function PortfolioDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { tokens, isReady } = useAuth();
  const authFetch = useAuthFetch();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [importState, setImportState] = useState<ImportState>({ status: "idle" });
  const [marketState, setMarketState] = useState<MarketState>({ status: "idle" });
  const [activeTab, setActiveTab] = useState<"assets" | "income">("assets");
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    if (isReady && !tokens) {
      router.replace("/login");
    }
  }, [isReady, tokens, router]);

  const loadMarketValue = useCallback(async () => {
    try {
      const res = await authFetch(`/api/portfolios/${params.id}/market-value`);
      if (res.ok) {
        const data = await res.json();
        setMarketState({ status: "loaded", data });
      } else {
        setMarketState({ status: "error" });
      }
    } catch {
      setMarketState({ status: "error" });
    }
  }, [params.id, authFetch]);

  const loadPortfolio = useCallback(async () => {
    try {
      const response = await authFetch(`/api/portfolios/${params.id}`);

      if (response.status === 404) {
        setState({ status: "not-found" });
        return;
      }

      if (!response.ok) {
        throw new Error(`Сервер ответил ${response.status}`);
      }

      const portfolio: PortfolioDetails = await response.json();
      setState({ status: "loaded", portfolio });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : "Неизвестная ошибка",
      });
    }
  }, [params.id, authFetch]);

  useEffect(() => {
    if (!tokens) return;
    loadPortfolio();
    loadMarketValue();
  }, [tokens, loadPortfolio, loadMarketValue]);

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // чтобы можно было выбрать тот же файл ещё раз
    if (!file) return;

    setImportState({ status: "loading" });

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await authFetch(`/api/portfolios/${params.id}/import/sber`, {
        method: "POST",
        body: formData,
      });

      const body: (ProblemDetailsBody & Partial<ImportReportResult>) | null = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        setImportState({
          status: "error",
          message: body?.title ?? body?.detail ?? `Сервер ответил ${response.status}`,
        });
        return;
      }

      setImportState({ status: "success", result: body as ImportReportResult });
      await loadPortfolio();
      loadMarketValue(); // подтянуть новые транзакции в список
    } catch {
      setImportState({ status: "error", message: "Не удалось загрузить файл" });
    }
  }

  if (!isReady || !tokens) {
    return null;
  }

  return (
    <div className="ledger-bg flex flex-1 justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <Link href="/portfolios" className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline">
          ← Все портфели
        </Link>

        {state.status === "loading" && <p className="mt-8 text-sm text-muted">Загружаем…</p>}

        {state.status === "not-found" && (
          <div className="mt-8 rounded-lg border border-danger/40 bg-danger/10 p-4">
            <p className="text-sm font-medium text-foreground">Портфель не найден</p>
            <p className="mt-1 text-xs text-muted">Либо его нет, либо он принадлежит другому пользователю.</p>
          </div>
        )}

        {state.status === "error" && (
          <div className="mt-8 rounded-lg border border-danger/40 bg-danger/10 p-4">
            <p className="text-sm font-medium text-foreground">Не удалось загрузить портфель</p>
            <p className="mt-1 text-xs text-muted">{state.message}</p>
          </div>
        )}

        {state.status === "loaded" && (
          <>
            <div className="mt-3 flex items-baseline justify-between">
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium leading-tight text-foreground">
                {state.portfolio.name}
              </h1>
              <span className="font-mono text-sm text-muted">{state.portfolio.baseCurrency}</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              Создан {formatDateTime(state.portfolio.createdAt)}
            </p>
            {/* ── Рыночная стоимость ──────────────────────────── */}
            {marketState.status === "loaded" && (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border border-surface-border bg-surface p-5">
                <div className="flex-1">
                  <p className="text-xs font-medium text-muted uppercase tracking-wider">
                    Рыночная стоимость
                  </p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-medium text-foreground">
                    {marketState.data.totalMarketValue.toLocaleString("ru-RU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-xl text-muted">{state.portfolio.baseCurrency}</span>
                  </p>
                </div>

                <div className="flex-1">
                  <p className="text-xs font-medium text-muted uppercase tracking-wider">
                    Нереализованный PnL
                  </p>
                  <p
                    className={
                      "mt-1 font-[family-name:var(--font-display)] text-3xl font-medium " +
                      (marketState.data.totalUnrealizedPnl >= 0 ? "text-success" : "text-danger")
                    }
                  >
                    {marketState.data.totalUnrealizedPnl > 0 ? "+" : ""}
                    {marketState.data.totalUnrealizedPnl.toLocaleString("ru-RU", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-xl opacity-70">
                      ({marketState.data.totalUnrealizedPnlPct > 0 ? "+" : ""}
                      {marketState.data.totalUnrealizedPnlPct.toLocaleString("ru-RU", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      %)
                    </span>
                  </p>
                </div>
                
                <div className="text-right self-end sm:self-center shrink-0">
                  <p className="text-xs text-muted">
                    Обновлено: {new Date(marketState.data.fetchedAt).toLocaleTimeString("ru-RU")}
                  </p>
                </div>
              </div>
            )}
            
            {marketState.status === "error" && (
              <div className="mt-6 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                Котировки временно недоступны.
              </div>
            )}

            {/* ── Активы и позиции с группировкой ──────────────────────────── */}
            {(() => {
              const cnyRate = marketState.status === "loaded" && marketState.data.cnyRate
                ? marketState.data.cnyRate
                : 12.9;

              const enrichedHoldings = state.portfolio.holdings.map((h) => {
                const mh = marketState.status === "loaded"
                  ? marketState.data.holdings.find(
                      (m) => m.assetId === h.assetId || m.ticker.toLowerCase() === h.ticker.toLowerCase()
                    )
                  : null;

                const category = getAssetCategory(h);

                const pricePerUnit = mh?.hasQuote && mh.quantity > 0
                  ? (mh.assetType === "Bond" ? mh.marketValue / mh.quantity : mh.lastPrice)
                  : h.avgPrice;

                const totalAmount = mh?.hasQuote
                  ? mh.marketValue
                  : (h.totalCost ?? (h.quantity * h.avgPrice));

                const totalCost = mh?.totalCost ?? (h.totalCost ?? (h.quantity * h.avgPrice));
                const pnl = mh?.hasQuote ? mh.unrealizedPnl : null;
                const pnlPct = mh?.hasQuote ? mh.unrealizedPnlPct : null;
                const currency = mh?.currency ?? h.avgPriceCurrency;

                return {
                  ...h,
                  category,
                  mh,
                  pricePerUnit,
                  totalAmount,
                  totalCost,
                  pnl,
                  pnlPct,
                  currency,
                };
              });

              const cashItems = state.portfolio.cashBalances.map((cb) => {
                let rate = 1;
                if (cb.currency === "CNY") rate = cnyRate;
                const valueInBase = cb.amount * rate;
                return {
                  ...cb,
                  rate,
                  valueInBase,
                };
              });

              const totalCashInBase = cashItems.reduce((acc, c) => acc + c.valueInBase, 0);

              const stocks = enrichedHoldings.filter((h) => h.category === "Stock");
              const bonds = enrichedHoldings.filter((h) => h.category === "Bond");
              const etfs = enrichedHoldings.filter((h) => h.category === "Etf");
              const currencyHoldings = enrichedHoldings.filter((h) => h.category === "Currency");

              const calcGroupTotals = (items: typeof enrichedHoldings) => {
                const marketValue = items.reduce((sum, i) => sum + i.totalAmount, 0);
                const cost = items.reduce((sum, i) => sum + i.totalCost, 0);
                const pnl = items.reduce((sum, i) => sum + (i.pnl ?? 0), 0);
                const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
                return { marketValue, cost, pnl, pnlPct };
              };

              const stocksTotals = calcGroupTotals(stocks);
              const bondsTotals = calcGroupTotals(bonds);
              const etfsTotals = calcGroupTotals(etfs);
              const currencyHoldingsTotals = calcGroupTotals(currencyHoldings);

              const currenciesTotals = {
                marketValue: currencyHoldingsTotals.marketValue + totalCashInBase,
                cost: currencyHoldingsTotals.cost + totalCashInBase,
                pnl: currencyHoldingsTotals.pnl,
                pnlPct: currencyHoldingsTotals.pnlPct,
              };

              const grandTotal =
                stocksTotals.marketValue +
                bondsTotals.marketValue +
                etfsTotals.marketValue +
                currenciesTotals.marketValue;

              const getShare = (val: number) => (grandTotal > 0 ? (val / grandTotal) * 100 : 0);

              const groups = [
                {
                  key: "stocks",
                  title: "Акции",
                  items: stocks,
                  totals: stocksTotals,
                  sharePct: getShare(stocksTotals.marketValue),
                },
                {
                  key: "bonds",
                  title: "Облигации",
                  items: bonds,
                  totals: bondsTotals,
                  sharePct: getShare(bondsTotals.marketValue),
                },
                {
                  key: "etfs",
                  title: "Фонды",
                  items: etfs,
                  totals: etfsTotals,
                  sharePct: getShare(etfsTotals.marketValue),
                },
                {
                  key: "currencies",
                  title: "Валюты и металлы",
                  items: currencyHoldings,
                  cashItems,
                  totals: currenciesTotals,
                  sharePct: getShare(currenciesTotals.marketValue),
                },
              ].filter((g) => g.items.length > 0 || (g.key === "currencies" && (g.cashItems?.length ?? 0) > 0));

              const renderTable = (items: typeof enrichedHoldings) => (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-surface-border bg-surface/50">
                        <th className="px-4 py-2.5 text-left font-medium text-muted">Тикер</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted">Название</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted">Кол-во</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted">Цена (1 шт.)</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted">Стоимость</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted">PnL</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted">Тип</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((h, i) => (
                        <tr
                          key={h.assetId}
                          className={
                            "border-b border-surface-border last:border-0 " +
                            (i % 2 === 0 ? "bg-surface" : "bg-transparent")
                          }
                        >
                          <td className="px-4 py-3 font-mono font-medium text-foreground">
                            {h.ticker}
                          </td>
                          <td className="px-4 py-3 text-foreground max-w-[180px] truncate" title={h.name}>
                            {h.name}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-foreground">
                            {h.quantity.toLocaleString("ru-RU", { maximumFractionDigits: 4 })}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-foreground">
                            <div>
                              {h.pricePerUnit.toLocaleString("ru-RU", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              <span className="text-muted">{h.currency}</span>
                            </div>
                            {h.mh?.hasQuote && Math.abs(h.avgPrice - h.pricePerUnit) > 0.01 && (
                              <div className="text-[10px] text-muted">
                                ср. {h.avgPrice.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                            <div>
                              {h.totalAmount.toLocaleString("ru-RU", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              <span className="text-muted">{h.currency}</span>
                            </div>
                            {h.mh?.hasQuote && Math.abs(h.totalCost - h.totalAmount) > 0.01 && (
                              <div className="text-[10px] text-muted">
                                покупка {h.totalCost.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {h.pnl !== null && h.pnlPct !== null ? (
                              <div className={h.pnl >= 0 ? "text-success" : "text-danger"}>
                                <div>
                                  {h.pnl > 0 ? "+" : ""}
                                  {h.pnl.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                                  <span className="text-xs opacity-75">{h.currency}</span>
                                </div>
                                <div className="text-[10px] opacity-80">
                                  ({h.pnlPct > 0 ? "+" : ""}
                                  {h.pnlPct.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted">
                            {ASSET_TYPE_LABELS[h.assetType]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );

              return (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-medium tracking-[0.15em] text-muted uppercase">
                      Все активы
                    </h2>
                    <div className="flex items-center gap-1 bg-surface-border/40 p-1 rounded-lg text-xs">
                      <button
                        type="button"
                        onClick={() => setViewMode("grouped")}
                        className={
                          "px-2.5 py-1 rounded-md transition-colors " +
                          (viewMode === "grouped"
                            ? "bg-surface font-medium text-foreground shadow-sm"
                            : "text-muted hover:text-foreground")
                        }
                      >
                        По группам
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("flat")}
                        className={
                          "px-2.5 py-1 rounded-md transition-colors " +
                          (viewMode === "flat"
                            ? "bg-surface font-medium text-foreground shadow-sm"
                            : "text-muted hover:text-foreground")
                        }
                      >
                        Все позиции
                      </button>
                    </div>
                  </div>

                  {viewMode === "grouped" ? (
                    <div className="space-y-3">
                      {groups.map((g) => {
                        const isCollapsed = !!collapsedGroups[g.key];
                        return (
                          <div
                            key={g.key}
                            className="rounded-xl border border-surface-border bg-surface overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => toggleGroup(g.key)}
                              className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-surface-border/20 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={
                                    "transition-transform duration-200 text-muted " +
                                    (isCollapsed ? "-rotate-90" : "rotate-0")
                                  }
                                >
                                  <ChevronDownIcon className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-base font-medium text-foreground">
                                      {g.title}
                                    </span>
                                    {g.items && g.items.length > 0 && (
                                      <span className="text-xs text-muted font-mono">
                                        ({g.items.length})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted font-mono mt-0.5">
                                    {g.sharePct.toFixed(2).replace(".", ",")}%
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="font-mono text-base font-medium text-foreground">
                                  {g.totals.marketValue.toLocaleString("ru-RU", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}{" "}
                                  <span className="text-sm text-muted">₽</span>
                                </div>
                                {g.totals.pnl !== null && g.totals.pnl !== 0 && (
                                  <div
                                    className={
                                      "text-xs font-mono mt-0.5 " +
                                      (g.totals.pnl >= 0 ? "text-success" : "text-danger")
                                    }
                                  >
                                    {g.totals.pnl > 0 ? "+" : ""}
                                    {g.totals.pnl.toLocaleString("ru-RU", {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}{" "}
                                    ₽{" · "}
                                    {g.totals.pnlPct > 0 ? "+" : ""}
                                    {g.totals.pnlPct.toFixed(2).replace(".", ",")}%
                                  </div>
                                )}
                              </div>
                            </button>

                            {!isCollapsed && (
                              <div className="border-t border-surface-border">
                                {g.items && g.items.length > 0 && renderTable(g.items)}
                                {g.cashItems && g.cashItems.length > 0 && (
                                  <div className="p-4 flex flex-wrap gap-3 bg-surface/40">
                                    {g.cashItems.map((cb) => (
                                      <div
                                        key={cb.currency}
                                        className="rounded-lg border border-surface-border bg-surface px-3.5 py-2.5 min-w-[140px]"
                                      >
                                        <div className="flex items-center justify-between text-xs text-muted">
                                          <span className="font-medium">{cb.currency}</span>
                                          {cb.currency !== "RUB" && (
                                            <span className="text-[11px] font-mono opacity-80">
                                              ×{cb.rate.toFixed(2)} ₽
                                            </span>
                                          )}
                                        </div>
                                        <p className="mt-1 font-mono text-base font-medium text-foreground">
                                          {cb.amount.toLocaleString("ru-RU", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}{" "}
                                          <span className="text-xs text-muted">
                                            {cb.currency === "RUB" ? "₽" : cb.currency === "CNY" ? "¥" : cb.currency}
                                          </span>
                                        </p>
                                        {cb.currency !== "RUB" && (
                                          <p className="text-[11px] text-muted font-mono mt-0.5">
                                            ≈{" "}
                                            {cb.valueInBase.toLocaleString("ru-RU", {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            })}{" "}
                                            ₽
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div>
                      {state.portfolio.cashBalances.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs text-muted uppercase font-medium tracking-wider mb-2">
                            Денежный баланс
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {state.portfolio.cashBalances.map((cb) => (
                              <div
                                key={cb.currency}
                                className="rounded-xl border border-surface-border bg-surface px-4 py-3 min-w-[120px]"
                              >
                                <p className="text-xs text-muted">{cb.currency}</p>
                                <p
                                  className={
                                    "mt-0.5 font-mono text-base font-medium " +
                                    (cb.amount >= 0 ? "text-foreground" : "text-danger")
                                  }
                                >
                                  {cb.amount.toLocaleString("ru-RU", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="overflow-x-auto rounded-xl border border-surface-border">
                        {renderTable(enrichedHoldings)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="mt-6 rounded-xl border border-surface-border bg-surface p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Обновить данные портфеля (Отчёт СберИнвестиций)</p>
                  <p className="mt-0.5 text-xs text-muted">HTML-файл отчёта брокера за период.</p>
                </div>
                <label className="shrink-0 cursor-pointer rounded-lg border border-surface-border px-3 py-1.5 text-xs text-foreground transition-colors hover:border-accent/50">
                  {importState.status === "loading" ? "Загружаем…" : "Выбрать файл"}
                  <input
                    type="file"
                    accept=".html,text/html"
                    onChange={handleImportFile}
                    disabled={importState.status === "loading"}
                    className="hidden"
                  />
                </label>
              </div>

              {importState.status === "success" && (
                <div className="result-enter mt-3 border-t border-surface-border pt-3 text-xs">
                  <p className="text-foreground">
                    Добавлено операций: <span className="font-mono">{importState.result.transactionsImported}</span>
                    {importState.result.transactionsSkippedAsDuplicate > 0 && (
                      <>, уже было (пропущено): <span className="font-mono">{importState.result.transactionsSkippedAsDuplicate}</span></>
                    )}
                    {importState.result.assetsCreated > 0 && (
                      <>, создано новых активов: <span className="font-mono">{importState.result.assetsCreated}</span></>
                    )}
                  </p>
                  {importState.result.unrecognizedDescriptions.length > 0 && (
                    <p className="mt-1.5 text-muted">
                      Не распознано {importState.result.unrecognizedDescriptions.length} операций
                      (пропущены, не потеряны в отчёте) — например: «{importState.result.unrecognizedDescriptions[0]}».
                    </p>
                  )}
                </div>
              )}

              {importState.status === "error" && (
                <p className="result-enter mt-3 border-t border-surface-border pt-3 text-xs text-danger">
                  {importState.message}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}




