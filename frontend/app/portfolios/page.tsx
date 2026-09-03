"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  CURRENCIES,
  formatDateTime,
  formatValidationErrors,
  type Currency,
  type PortfolioListItem,
  type ProblemDetailsBody,
} from "@/lib/api";
import { useAuth, useAuthFetch } from "@/lib/AuthContext";

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; portfolios: PortfolioListItem[] }
  | { status: "error"; message: string };

export default function PortfoliosPage() {
  const router = useRouter();
  const { tokens, isReady, logout } = useAuth();
  const authFetch = useAuthFetch();

  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (isReady && !tokens) {
      router.replace("/login");
    }
  }, [isReady, tokens, router]);

  useEffect(() => {
    if (!tokens) return;

    let cancelled = false;

    async function load() {
      try {
        const response = await authFetch("/api/portfolios");
        if (!response.ok) throw new Error(`Сервер ответил ${response.status}`);

        const portfolios: PortfolioListItem[] = await response.json();
        if (!cancelled) setState({ status: "loaded", portfolios });
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
    // authFetch пересоздаётся каждый рендер — следим только за наличием токена.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens]);

  if (!isReady || !tokens) {
    return null;
  }

  return (
    <div className="ledger-bg flex flex-1 justify-center px-6 py-16">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs tracking-[0.2em] text-muted uppercase">MyBrokerAI</p>
          <div className="flex items-center gap-4 text-xs text-muted">
            <Link href="/market" className="underline-offset-4 hover:text-foreground hover:underline">
              МосБиржа
            </Link>
            <button onClick={logout} className="underline-offset-4 hover:text-foreground hover:underline">
              Выйти
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-medium leading-tight text-foreground">
            Портфели
          </h1>
          <button
            onClick={() => setShowCreateForm((v) => !v)}
            className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-foreground transition-colors hover:border-accent/50"
          >
            {showCreateForm ? "Отмена" : "+ Новый портфель"}
          </button>
        </div>

        {showCreateForm && (
          <CreatePortfolioForm
            onCreated={(portfolio) => {
              setShowCreateForm(false);
              setState((s) =>
                s.status === "loaded"
                  ? { status: "loaded", portfolios: [portfolio, ...s.portfolios] }
                  : s,
              );
            }}
          />
        )}

        {state.status === "loading" && <p className="mt-8 text-sm text-muted">Загружаем…</p>}

        {state.status === "error" && (
          <div className="mt-8 rounded-lg border border-danger/40 bg-danger/10 p-4">
            <p className="text-sm font-medium text-foreground">Не удалось загрузить портфели</p>
            <p className="mt-1 text-xs text-muted">{state.message}</p>
          </div>
        )}

        {state.status === "loaded" && state.portfolios.length === 0 && !showCreateForm && (
          <div className="mt-8 rounded-2xl border border-dashed border-surface-border p-8 text-center">
            <p className="text-sm text-muted">Портфелей пока нет.</p>
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
                  <div className="flex flex-col items-end">
                    <PortfolioMarketValueIndicator id={portfolio.id} />
                    <span className="font-mono text-xs text-muted">{portfolio.baseCurrency}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CreatePortfolioForm({ onCreated }: { onCreated: (portfolio: PortfolioListItem) => void }) {
  const authFetch = useAuthFetch();
  const [name, setName] = useState("");
  const [baseCurrency, setBaseCurrency] = useState<Currency>("RUB");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await authFetch("/api/portfolios", {
        method: "POST",
        body: JSON.stringify({ name, baseCurrency }),
      });

      const body: (ProblemDetailsBody & { id?: string }) | null = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        setError(body?.title ?? formatValidationErrors(body?.errors) ?? `Сервер ответил ${response.status}`);
        return;
      }

      onCreated({
        id: body!.id!,
        name,
        baseCurrency,
        transactionsCount: 0,
        createdAt: new Date().toISOString(),
      });
    } catch {
      setError("Не удалось создать портфель");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-5">
      <div className="flex gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название портфеля"
          required
          autoFocus
          className="flex-1 rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
        <select
          value={baseCurrency}
          onChange={(e) => setBaseCurrency(e.target.value as Currency)}
          className="rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        >
          {CURRENCIES.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "…" : "Создать"}
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </form>
  );
}

function PortfolioMarketValueIndicator({ id }: { id: string }) {
  const authFetch = useAuthFetch();
  const [value, setValue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authFetch(`/api/portfolios/${id}/market-value`)
      .then((res) => {
        if (!res.ok) throw new Error("err");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setValue(data.totalMarketValue);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, authFetch]);

  if (loading) {
    return <span className="font-mono text-sm text-muted animate-pulse">…</span>;
  }
  
  if (value === null) {
    return <span className="font-mono text-sm text-muted">—</span>;
  }

  return (
    <span className="font-mono font-medium text-foreground">
      {value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}
