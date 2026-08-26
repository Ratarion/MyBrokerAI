"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";

export default function Home() {
  const router = useRouter();
  const { tokens, isReady } = useAuth();

  useEffect(() => {
    if (isReady && tokens) {
      router.replace("/portfolios");
    }
  }, [isReady, tokens, router]);

  // Пока не проверили localStorage или уже решили редиректить — ничего не рисуем,
  // чтобы не мигать формой логина залогиненным пользователям.
  if (!isReady || tokens) {
    return null;
  }

  return (
    <div className="ledger-bg flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <p className="font-mono text-xs tracking-[0.2em] text-muted uppercase">MyBrokerAI</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl font-medium leading-tight text-foreground">
          Трекер портфеля с AI-советником
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Зарегистрируйся — портфель «Основной» создастся автоматически, и можно сразу вносить операции.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/register"
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
          >
            Зарегистрироваться
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-surface-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent/50"
          >
            Войти
          </Link>
        </div>
      </div>
    </div>
  );
}
