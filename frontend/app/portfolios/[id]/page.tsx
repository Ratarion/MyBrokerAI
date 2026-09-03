"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ChangeEvent } from "react";
import {
  ASSET_TYPE_LABELS,
  TRANSACTION_TYPE_LABELS,
  formatDateTime,
  type CashBalanceDto,
  type HoldingDto,
  type ImportReportResult,
  type PortfolioDetails,
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

export default function PortfolioDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { tokens, isReady } = useAuth();
  const authFetch = useAuthFetch();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [importState, setImportState] = useState<ImportState>({ status: "idle" });

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (!tokens) return;
    loadPortfolio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, params.id]);

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
      await loadPortfolio(); // подтянуть новые транзакции в список
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

            {/* ── Денежный баланс ─────────────────────────────── */}
            {state.portfolio.cashBalances.length > 0 && (
              <>
                <h2 className="mt-8 text-xs font-medium tracking-[0.15em] text-muted uppercase">
                  Денежный баланс
                </h2>
                <div className="mt-3 flex flex-wrap gap-3">
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
              </>
            )}

            {/* ── Позиции (открытые холдинги) ──────────────────── */}
            {state.portfolio.holdings.length > 0 && (
              <>
                <h2 className="mt-8 text-xs font-medium tracking-[0.15em] text-muted uppercase">
                  Позиции
                </h2>
                <div className="mt-3 overflow-x-auto rounded-xl border border-surface-border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-surface-border bg-surface">
                        <th className="px-4 py-2.5 text-left font-medium text-muted">Тикер</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted">Название</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted">Кол-во</th>
                        <th className="px-4 py-2.5 text-right font-medium text-muted">Ср. цена</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted">Тип</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.portfolio.holdings.map((h, i) => (
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
                            {h.avgPrice.toLocaleString("ru-RU", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            <span className="text-muted">{h.avgPriceCurrency}</span>
                          </td>
                          <td className="px-4 py-3 text-muted">
                            {ASSET_TYPE_LABELS[h.assetType]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="mt-6 rounded-xl border border-surface-border bg-surface p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Импорт отчёта СберИнвестиций</p>
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
