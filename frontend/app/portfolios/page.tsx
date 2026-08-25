"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_URL, SEED_USER_ID, formatDateTime, type PortfolioListItem } from "@/lib/api";

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; portfolios: PortfolioListItem[] }
  | { status: "error"; message: string };

export default function PortfoliosPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          `${API_URL}/api/portfolios?userId=${encodeURIComponent(SEED_USER_ID)}`,
        );

        if (!response.ok) {
          throw new Error(`Сервер ответил ${response.status}`);
        }

        const portfolios: PortfolioListItem[] = await response.json();

        if (!cancelled) {
          setState({ status: "loaded", portfolios });
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
  }, []);

  return (
    <div className="ledger-bg flex flex-1 justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
            MyBrokerAI
          </p>
          <Link href="/" className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline">
            + Создать портфель
          </Link>
        </div>

        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-medium leading-tight text-foreground">
          Портфели
        </h1>

        {state.status === "loading" && (
          <p className="mt-8 text-sm text-muted">Загружаем…</p>
        )}

        {state.status === "error" && (
          <div className="mt-8 rounded-lg border border-danger/40 bg-danger/10 p-4">
            <p className="text-sm font-medium text-foreground">Не удалось загрузить портфели</p>
            <p className="mt-1 text-xs text-muted">{state.message}</p>
          </div>
        )}

        {state.status === "loaded" && state.portfolios.length === 0 && (
          <div className="mt-8 rounded-2xl border border-dashed border-surface-border p-8 text-center">
            <p className="text-sm text-muted">
              Портфелей пока нет.{" "}
              <Link href="/" className="text-accent underline-offset-4 hover:underline">
                Создай первый
              </Link>
              .
            </p>
          </div>
        )}

        {state.status === "loaded" && state.portfolios.length > 0 && (
          <ul className="mt-8 flex flex-col gap-3">
            {state.portfolios.map((portfolio) => (
              <li key={portfolio.id}>
                <Link
                  href={`/portfolios/${portfolio.id}`}
                  className="flex items-center justify-between rounded-xl border border-surface-border bg-surface px-5 py-4 transition-colors hover:border-accent/50"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{portfolio.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {portfolio.transactionsCount === 0
                        ? "Без транзакций"
                        : `${portfolio.transactionsCount} тр.`}{" "}
                      · создан {formatDateTime(portfolio.createdAt)}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-muted">{portfolio.baseCurrency}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
