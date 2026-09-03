"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
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

export default function OperationsPage() {
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

        {state.status === "loaded" && (
          <>
            <div className="mt-3 flex items-baseline justify-between">
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium leading-tight text-foreground">
                Операции
              </h1>
            </div>

            <h2 className="mt-10 text-xs font-medium tracking-[0.15em] text-muted uppercase">
              История транзакций
            </h2>

            {state.portfolio.transactions.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-surface-border p-8 text-center">
                <p className="text-sm text-muted">Транзакций пока нет.</p>
              </div>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {state.portfolio.transactions.map((tx) => (
                  <li
                    key={tx.id}
                    className="rounded-xl border border-surface-border bg-surface px-5 py-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {TRANSACTION_TYPE_LABELS[tx.type] || tx.type}
                      </span>
                      <span className="text-xs text-muted">{formatDateTime(tx.executedAt)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-mono text-xs text-muted">
                      <span>Кол-во: {tx.quantity}</span>
                      <span>
                        Цена: {tx.priceAmount} {tx.priceCurrency}
                      </span>
                      <span>
                        Комиссия: {tx.feeAmount} {tx.feeCurrency}
                      </span>
                      {tx.assetId && <span>Актив: {tx.assetId.slice(0, 8)}…</span>}
                    </div>
                    {tx.notes && <p className="mt-2 text-xs text-muted">{tx.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
