"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import {
  API_URL,
  CURRENCIES,
  SEED_USER_ID,
  formatValidationErrors,
  type Currency,
  type ProblemDetailsBody,
} from "@/lib/api";

type SubmitState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; portfolioId: string }
  | { status: "error"; title: string; detail?: string };

export default function Home() {
  // useSearchParams требует Suspense-границу в App Router.
  return (
    <Suspense fallback={null}>
      <CreatePortfolioForm />
    </Suspense>
  );
}

function CreatePortfolioForm() {
  const searchParams = useSearchParams();
  const userIdFromQuery = searchParams.get("userId");

  const [name, setName] = useState("Основной портфель");
  const [baseCurrency, setBaseCurrency] = useState<Currency>("RUB");
  const [userId, setUserId] = useState(userIdFromQuery ?? SEED_USER_ID);
  const [state, setState] = useState<SubmitState>({ status: "idle" });
  const [copied, setCopied] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setState({ status: "loading" });
    setCopied(false);

    try {
      const response = await fetch(`${API_URL}/api/portfolios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, name, baseCurrency }),
      });

      const body: (ProblemDetailsBody & { id?: string }) | null = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        setState({
          status: "error",
          title: body?.title ?? `Сервер ответил ${response.status}`,
          detail: body?.detail ?? formatValidationErrors(body?.errors),
        });
        return;
      }

      setState({ status: "success", portfolioId: body!.id! });
    } catch {
      setState({
        status: "error",
        title: "Не удалось связаться с API",
        detail: `Проверь, что backend запущен и слушает на ${API_URL}.`,
      });
    }
  }

  async function handleCopy(id: string) {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="ledger-bg flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface p-8 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs tracking-[0.2em] text-muted uppercase">MyBrokerAI</p>
          <div className="flex gap-3 text-xs text-muted">
            <Link href="/register" className="underline-offset-4 hover:text-foreground hover:underline">
              Регистрация
            </Link>
            <Link href="/portfolios" className="underline-offset-4 hover:text-foreground hover:underline">
              Все портфели →
            </Link>
          </div>
        </div>

        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-medium leading-tight text-foreground">
          Создать портфель
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-muted">
          Форма отправляет запрос напрямую в InvestTracker API и создаёт запись в Postgres.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <Field label="Название портфеля">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
            />
          </Field>

          <Field label="Базовая валюта">
            <select
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value as Currency)}
              className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Id пользователя"
            hint={
              userIdFromQuery
                ? "Подставлен id только что зарегистрированного пользователя."
                : "Нет своего пользователя? Сначала зарегистрируйся — ссылка выше."
            }
          >
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none transition-colors focus:border-accent"
            />
          </Field>

          <button
            type="submit"
            disabled={state.status === "loading"}
            className="mt-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {state.status === "loading" ? "Создаём…" : "Создать портфель"}
          </button>
        </form>

        {state.status === "success" && (
          <div className="result-enter mt-6 rounded-lg border border-accent/40 bg-accent/10 p-4">
            <p className="text-sm font-medium text-foreground">Портфель создан</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <code className="break-all font-mono text-xs text-muted">{state.portfolioId}</code>
              <button
                type="button"
                onClick={() => handleCopy(state.portfolioId)}
                className="shrink-0 rounded-md border border-surface-border px-2 py-1 text-xs text-muted transition-colors hover:text-foreground"
              >
                {copied ? "Скопировано" : "Копировать"}
              </button>
            </div>
            <Link
              href={`/portfolios/${state.portfolioId}`}
              className="mt-3 inline-block text-xs text-accent underline-offset-4 hover:underline"
            >
              Открыть портфель →
            </Link>
          </div>
        )}

        {state.status === "error" && (
          <div className="result-enter mt-6 rounded-lg border border-danger/40 bg-danger/10 p-4">
            <p className="text-sm font-medium text-foreground">{state.title}</p>
            {state.detail && <p className="mt-1 text-xs text-muted">{state.detail}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted/70">{hint}</span>}
    </label>
  );
}
