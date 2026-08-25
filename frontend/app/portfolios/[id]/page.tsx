"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  API_URL,
  TRANSACTION_TYPE_LABELS,
  formatDateTime,
  type PortfolioDetails,
} from "@/lib/api";

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; portfolio: PortfolioDetails }
  | { status: "not-found" }
  | { status: "error"; message: string };

export default function PortfolioDetailsPage() {
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`${API_URL}/api/portfolios/${params.id}`);

        if (response.status === 404) {
          if (!cancelled) setState({ status: "not-found" });
          return;
        }

        if (!response.ok) {
          throw new Error(`Сервер ответил ${response.status}`);
        }

        const portfolio: PortfolioDetails = await response.json();

        if (!cancelled) {
          setState({ status: "loaded", portfolio });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Неизвестная ошибка",
          });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

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
            <p className="mt-1 text-xs text-muted">Проверь ссылку — такого Id нет в базе.</p>
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

            <h2 className="mt-10 text-xs font-medium tracking-[0.15em] text-muted uppercase">
              Транзакции
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
                        {TRANSACTION_TYPE_LABELS[tx.type]}
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
