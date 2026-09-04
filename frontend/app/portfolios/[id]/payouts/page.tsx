"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PayoutCalendar } from "@/components/PayoutCalendar";
import { type PortfolioDetails, type PortfolioPayoutsScheduleDto } from "@/lib/api";
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
  const [schedule, setSchedule] = useState<PortfolioPayoutsScheduleDto | null>(null);

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

      // Загружаем расписание выплат (включая будущие купоны и амортизации с MOEX)
      try {
        const payoutsRes = await authFetch(`/api/portfolios/${params.id}/payouts`);
        if (payoutsRes.ok) {
          const scheduleData: PortfolioPayoutsScheduleDto = await payoutsRes.json();
          setSchedule(scheduleData);
        }
      } catch {
        // Fallback: PayoutCalendar построит прогноз на базе transactions
      }
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
      <div className="mx-auto max-w-6xl px-6 py-8">
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
          <div className="mt-6">
            <PayoutCalendar transactions={state.portfolio.transactions} schedule={schedule} />
          </div>
        )}
      </div>
    </div>
  );
}
