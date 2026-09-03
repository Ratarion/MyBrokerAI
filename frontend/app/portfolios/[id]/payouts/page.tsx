"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PayoutCalendar } from "@/components/PayoutCalendar";
import {
  TRANSACTION_TYPE_LABELS,
  formatDateTime,
  type PortfolioDetails,
} from "@/lib/api";
import { useAuth, useAuthFetch } from "@/lib/AuthContext";

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; portfolio: PortfolioDetails }
  | { status: "not-found" }
  | { status: "error"; message: string };

export default function PayoutsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { tokens, isReady } = useAuth();
  const authFetch = useAuthFetch();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (isReady && !tokens) {
      router.replace("/login");
    }
  }, [isReady, tokens, router]);

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
  }, [tokens, loadPortfolio]);

  if (!isReady || !tokens) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Link
          href={`/portfolios/${params.id}`}
          className="inline-flex items-center text-sm font-medium text-muted hover:text-foreground transition-colors"
        >
          ← Вернуться к активам
        </Link>

        {state.status === "loading" && <p className="mt-8 text-sm text-muted">Загружаем…</p>}
        {state.status === "not-found" && <p className="mt-8 text-sm text-danger">Портфель не найден</p>}
        {state.status === "error" && <p className="mt-8 text-sm text-danger">{state.message}</p>}

        {state.status === "loaded" && (() => {
          const incomeTxs = state.portfolio.transactions.filter(
            (tx) => tx.type === "Dividend" || tx.type === "Coupon" || tx.type === "Tax"
          );
          
          const totalDividends = incomeTxs
            .filter((t) => t.type === "Dividend")
            .reduce((sum, t) => sum + t.priceAmount, 0);
          const totalCoupons = incomeTxs
            .filter((t) => t.type === "Coupon")
            .reduce((sum, t) => sum + t.priceAmount, 0);
          const totalTaxes = incomeTxs
            .filter((t) => t.type === "Tax")
            .reduce((sum, t) => sum + t.priceAmount, 0);
          
          const netIncome = totalDividends + totalCoupons - totalTaxes;

          return (
            <div className="mt-3">
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium leading-tight text-foreground">
                Пассивный доход
              </h1>

              <div className="mt-8">
                <PayoutCalendar transactions={state.portfolio.transactions} />
              </div>

              <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-surface-border bg-surface p-4">
                  <p className="text-xs text-muted uppercase">Дивиденды</p>
                  <p className="mt-1 font-mono text-xl text-success">
                    +{totalDividends.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-xl border border-surface-border bg-surface p-4">
                  <p className="text-xs text-muted uppercase">Купоны</p>
                  <p className="mt-1 font-mono text-xl text-success">
                    +{totalCoupons.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-xl border border-surface-border bg-surface p-4">
                  <p className="text-xs text-muted uppercase">Налоги</p>
                  <p className="mt-1 font-mono text-xl text-danger">
                    -{totalTaxes.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="rounded-xl border border-surface-border bg-surface p-4">
                  <p className="text-xs text-muted uppercase">Чистый доход</p>
                  <p className={`mt-1 font-mono text-xl ${netIncome >= 0 ? "text-success" : "text-danger"}`}>
                    {netIncome >= 0 ? "+" : ""}{netIncome.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <h2 className="mt-12 mb-4 text-xs font-medium tracking-[0.15em] text-muted uppercase">
                История выплат
              </h2>
              
              {incomeTxs.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-surface-border p-8 text-center">
                  <p className="text-sm text-muted">Нет данных о дивидендах, купонах или налогах.</p>
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border border-surface-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-surface-border bg-surface">
                        <th className="px-4 py-2.5 text-left font-medium text-muted">Дата</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted">Тип</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted">Актив</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted">Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeTxs.map((tx, i) => (
                        <tr
                          key={tx.id}
                          className={
                            "border-b border-surface-border last:border-0 " +
                            (i % 2 === 0 ? "bg-surface" : "bg-transparent")
                          }
                        >
                          <td className="px-4 py-3 text-foreground whitespace-nowrap">
                            {formatDateTime(tx.executedAt).split(',')[0]}
                          </td>
                          <td className="px-4 py-3 text-muted">
                            {TRANSACTION_TYPE_LABELS[tx.type]}
                          </td>
                          <td className="px-4 py-3 text-foreground font-mono">
                            {tx.assetTicker || <span className="text-muted">—</span>}
                            {tx.assetName && <span className="ml-2 font-sans text-muted truncate max-w-[150px] inline-block align-bottom">{tx.assetName}</span>}
                          </td>
                          <td className={`px-4 py-3 text-right font-mono font-medium ${
                            tx.type === "Tax" ? "text-danger" : "text-success"
                          }`}>
                            {tx.type === "Tax" ? "-" : "+"}{tx.priceAmount.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {tx.priceCurrency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
