"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function CorporateActionsPage() {
  const params = useParams<{ id: string }>();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <Link
          href={`/portfolios/${params.id}`}
          className="inline-flex items-center text-sm font-medium text-muted hover:text-foreground transition-colors"
        >
          ← Вернуться к активам
        </Link>

        <h1 className="mt-6 font-[family-name:var(--font-display)] text-3xl font-medium text-foreground">
          Корпоративные действия
        </h1>
        <p className="mt-3 text-sm text-muted">
          Сплиты, обратные сплиты, buyback и прочие корпоративные события по вашим активам.
        </p>

        <div className="mt-8 rounded-2xl border border-dashed border-surface-border p-12 text-center">
          <p className="text-lg text-muted">🏢</p>
          <p className="mt-2 text-sm text-muted">Раздел в разработке</p>
        </div>
      </div>
    </div>
  );
}
