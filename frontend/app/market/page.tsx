"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { API_URL, MOEX_POPULAR_TICKERS, type MoexCandle } from "@/lib/api";

const RANGES = [
  { label: "1М", days: 30 },
  { label: "6М", days: 182 },
  { label: "1Г", days: 365 },
  { label: "3Г", days: 365 * 3 },
] as const;

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; candles: MoexCandle[] }
  | { status: "error"; message: string };

export default function MarketPage() {
  const [ticker, setTicker] = useState("IMOEX");
  const [customTicker, setCustomTicker] = useState("");
  const [rangeDays, setRangeDays] = useState<number>(182);
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });

      const till = new Date();
      const from = new Date();
      from.setDate(from.getDate() - rangeDays);

      const params = new URLSearchParams({ from: formatDate(from), till: formatDate(till) });

      try {
        const response = await fetch(`${API_URL}/api/market/moex/${ticker}/candles?${params}`);
        if (!response.ok) throw new Error(`Сервер ответил ${response.status}`);

        const candles: MoexCandle[] = await response.json();
        if (!cancelled) setState({ status: "loaded", candles });
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
  }, [ticker, rangeDays]);

  const chartData = useMemo(() => {
    if (state.status !== "loaded") return [];
    return state.candles.map((c) => ({ date: c.date, close: c.close }));
  }, [state]);

  function handleCustomTickerSubmit(event: FormEvent) {
    event.preventDefault();
    const value = customTicker.trim().toUpperCase();
    if (value) setTicker(value);
  }

  return (
    <div className="ledger-bg flex flex-1 justify-center px-6 py-16">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs tracking-[0.2em] text-muted uppercase">MyBrokerAI</p>
          <Link
            href="/portfolios"
            className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            ← Портфели
          </Link>
        </div>

        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-medium leading-tight text-foreground">
          МосБиржа
        </h1>
        <p className="mt-2 text-xs text-muted">
          Данные ISS МосБиржи, дневные свечи, задержка до ~15 минут.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {MOEX_POPULAR_TICKERS.map((t) => (
            <button
              key={t.ticker}
              onClick={() => setTicker(t.ticker)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                ticker === t.ticker
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-surface-border text-muted hover:border-accent/50 hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleCustomTickerSubmit} className="mt-3 flex gap-2">
          <input
            value={customTicker}
            onChange={(e) => setCustomTicker(e.target.value)}
            placeholder="Свой тикер, например ROSN"
            className="w-56 rounded-lg border border-surface-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-lg border border-surface-border px-3 py-1.5 text-xs text-foreground transition-colors hover:border-accent/50"
          >
            Показать
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="font-mono text-xs text-muted">{ticker}</h2>
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => setRangeDays(r.days)}
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                  rangeDays === r.days ? "bg-accent/10 text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 h-80 rounded-2xl border border-surface-border bg-surface p-4">
          {state.status === "loading" && (
            <div className="flex h-full items-center justify-center text-sm text-muted">Загружаем…</div>
          )}

          {state.status === "error" && (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
              <p className="text-sm font-medium text-foreground">Не удалось загрузить котировки</p>
              <p className="text-xs text-muted">{state.message}</p>
            </div>
          )}

          {state.status === "loaded" && chartData.length === 0 && (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Нет данных за этот период — проверь тикер.
            </div>
          )}

          {state.status === "loaded" && chartData.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--surface-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickFormatter={(value: string) => value.slice(5)}
                  axisLine={{ stroke: "var(--surface-border)" }}
                  tickLine={false}
                  minTickGap={40}
                />
                <YAxis
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  domain={["auto", "auto"]}
                  width={56}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--surface-border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--muted)" }}
                  formatter={(value: number) => [value.toFixed(2), "Закрытие"]}
                />
                <Line type="monotone" dataKey="close" stroke="var(--accent)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
