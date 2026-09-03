"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export function Navbar() {
  const pathname = usePathname();
  const { tokens, logout, isReady } = useAuth();

  if (!isReady || !tokens) return null;

  const match = pathname.match(/^\/portfolios\/([a-zA-Z0-9-]+)/);
  const currentPortfolioId = match ? match[1] : null;

  const globalNavLinks = [
    { href: "/portfolios", label: "Все портфели" },
    { href: "/market", label: "Рынок" },
  ];

  return (
    <nav className="border-b border-surface-border bg-surface px-6 py-3 flex items-center justify-between z-10 sticky top-0">
      <div className="flex items-center gap-8">
        <Link href="/" className="font-[family-name:var(--font-display)] font-semibold text-lg text-foreground tracking-wide">
          MyBroker<span className="text-accent">AI</span>
        </Link>
        <div className="hidden md:flex gap-6 items-center">
          {globalNavLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={"text-sm font-medium transition-colors " + (isActive ? "text-foreground" : "text-muted hover:text-foreground")}
              >
                {link.label}
              </Link>
            );
          })}
          
          {currentPortfolioId && (
            <>
              <div className="h-4 w-px bg-surface-border mx-2"></div>
              
              <div className="relative group py-2">
                <button className="text-sm font-medium text-muted hover:text-foreground flex items-center gap-1">
                  Аналитика
                  <span className="text-[10px]">▼</span>
                </button>
                <div className="absolute left-0 top-full mt-0 w-48 bg-[#1E2329] border border-surface-border rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1">
                  <Link href={"/portfolios/" + currentPortfolioId + "/analytics/general"} className="block px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-[#2A2F35]">Общее</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/analytics/diversification"} className="block px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-[#2A2F35]">Диверсификация</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/analytics/dividends"} className="block px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-[#2A2F35]">Дивиденды</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/analytics/growth"} className="block px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-[#2A2F35]">Рост</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/analytics/metrics"} className="block px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-[#2A2F35]">Метрики</Link>
                </div>
              </div>

              <div className="relative group py-2">
                <button className="text-sm font-medium text-muted hover:text-foreground flex items-center gap-1">
                  Портфель
                  <span className="text-[10px]">▼</span>
                </button>
                <div className="absolute left-0 top-full mt-0 w-56 bg-[#1E2329] border border-surface-border rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1">
                  <Link href={"/portfolios/" + currentPortfolioId} className="block px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-[#2A2F35]">Активы</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/operations"} className="block px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-[#2A2F35]">Операции</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/payouts"} className="block px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-[#2A2F35]">Календарь выплат</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/goal"} className="block px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-[#2A2F35]">Моя цель</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/currency"} className="block px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-[#2A2F35]">Валюта</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/categories"} className="block px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-[#2A2F35]">Категории</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/corporate-actions"} className="block px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-[#2A2F35]">Корпоративные действия</Link>
                </div>
              </div>

              <div className="relative group py-2">
                <button className="text-sm font-medium text-muted hover:text-foreground flex items-center gap-1">
                  Инструменты
                  <span className="text-[10px]">▼</span>
                </button>
                <div className="absolute left-0 top-full mt-0 w-56 bg-[#1E2329] border border-surface-border rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1">
                  <Link href={"/portfolios/" + currentPortfolioId + "/tools/rebalance"} className="block px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-[#2A2F35]">Ребалансировка</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/tools/top-dividend"} className="block px-4 py-2 text-sm text-muted hover:text-foreground hover:bg-[#2A2F35]">Топ дивидендных акций</Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={logout}
          className="text-xs text-muted hover:text-danger transition-colors font-medium"
        >
          Выйти
        </button>
      </div>
    </nav>
  );
}