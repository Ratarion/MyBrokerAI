"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { API_URL, formatValidationErrors, type ProblemDetailsBody } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import type { AuthTokens } from "@/lib/auth";

type SubmitState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; title: string; detail?: string };

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<SubmitState>({ status: "idle" });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setState({ status: "loading" });

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (response.status === 401) {
        setState({ status: "error", title: "Неверный email или пароль" });
        return;
      }

      const body: (ProblemDetailsBody & Partial<AuthTokens>) | null = await response
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

      login(body as AuthTokens);
      router.push("/portfolios");
    } catch {
      setState({
        status: "error",
        title: "Не удалось связаться с API",
        detail: `Проверь, что backend запущен и слушает на ${API_URL}.`,
      });
    }
  }

  return (
    <div className="ledger-bg flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-surface-border bg-surface p-8 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs tracking-[0.2em] text-muted uppercase">MyBrokerAI</p>
          <Link href="/register" className="text-xs text-muted underline-offset-4 hover:text-foreground hover:underline">
            Регистрация →
          </Link>
        </div>

        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-medium leading-tight text-foreground">
          Вход
        </h1>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5">
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
            />
          </Field>

          <Field label="Пароль">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-surface-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-accent"
            />
          </Field>

          <button
            type="submit"
            disabled={state.status === "loading"}
            className="mt-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {state.status === "loading" ? "Входим…" : "Войти"}
          </button>
        </form>

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
