"use client";

import { use } from "react";

export default function DiversificationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Диверсификация портфеля</h1>
      <div className="bg-surface border border-surface-border p-8 rounded text-center text-muted">
        <h2 className="text-xl mb-4">Скоро здесь будет график диверсификации</h2>
        <p>Круговые диаграммы с распределением активов по классам (Акции, Облигации, Фонды, Валюта), секторам экономики и отдельным бумагам.</p>
      </div>
    </div>
  );
}
