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

  // Determine which dropdown section is active
  const isAnalyticsActive = pathname.includes("/analytics/");
  const isToolsActive = pathname.includes("/tools/");
  // Portfolio dropdown is active if we're on a portfolio page but NOT in analytics or tools
  const isPortfolioSectionActive = currentPortfolioId !== null && !isAnalyticsActive && !isToolsActive;

  function dropdownLinkClass(href: string): string {
    const isActive = pathname === href;
    return (
      "block px-4 py-2 text-sm transition-colors " +
      (isActive
        ? "text-accent bg-accent/10 font-medium"
        : "text-muted hover:text-foreground hover:bg-[#2A2F35]")
    );
  }

  function dropdownButtonClass(isActive: boolean): string {
    return (
      "text-sm font-medium flex items-center gap-1 transition-colors " +
      (isActive
        ? "text-foreground"
        : "text-muted hover:text-foreground")
    );
  }

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
                <button className={dropdownButtonClass(isAnalyticsActive)}>
                  Аналитика
                  <span className="text-[10px]">▼</span>
                </button>
                {isAnalyticsActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full"></div>}
                <div className="absolute left-0 top-full mt-0 w-48 bg-[#1E2329] border border-surface-border rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1">
                  <Link href={"/portfolios/" + currentPortfolioId + "/analytics/general"} className={dropdownLinkClass("/portfolios/" + currentPortfolioId + "/analytics/general")}>Общее</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/analytics/diversification"} className={dropdownLinkClass("/portfolios/" + currentPortfolioId + "/analytics/diversification")}>Диверсификация</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/analytics/dividends"} className={dropdownLinkClass("/portfolios/" + currentPortfolioId + "/analytics/dividends")}>Дивиденды</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/analytics/growth"} className={dropdownLinkClass("/portfolios/" + currentPortfolioId + "/analytics/growth")}>Рост</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/analytics/metrics"} className={dropdownLinkClass("/portfolios/" + currentPortfolioId + "/analytics/metrics")}>Метрики</Link>
                </div>
              </div>

              <div className="relative group py-2">
                <button className={dropdownButtonClass(isPortfolioSectionActive)}>
                  Портфель
                  <span className="text-[10px]">▼</span>
                </button>
                {isPortfolioSectionActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full"></div>}
                <div className="absolute left-0 top-full mt-0 w-56 bg-[#1E2329] border border-surface-border rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1">
                  <Link href={"/portfolios/" + currentPortfolioId} className={dropdownLinkClass("/portfolios/" + currentPortfolioId)}>Активы</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/operations"} className={dropdownLinkClass("/portfolios/" + currentPortfolioId + "/operations")}>Операции</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/payouts"} className={dropdownLinkClass("/portfolios/" + currentPortfolioId + "/payouts")}>Календарь выплат</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/goal"} className={dropdownLinkClass("/portfolios/" + currentPortfolioId + "/goal")}>Моя цель</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/currency"} className={dropdownLinkClass("/portfolios/" + currentPortfolioId + "/currency")}>Валюта</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/categories"} className={dropdownLinkClass("/portfolios/" + currentPortfolioId + "/categories")}>Категории</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/corporate-actions"} className={dropdownLinkClass("/portfolios/" + currentPortfolioId + "/corporate-actions")}>Корпоративные действия</Link>
                </div>
              </div>

              <div className="relative group py-2">
                <button className={dropdownButtonClass(isToolsActive)}>
                  Инструменты
                  <span className="text-[10px]">▼</span>
                </button>
                {isToolsActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full"></div>}
                <div className="absolute left-0 top-full mt-0 w-56 bg-[#1E2329] border border-surface-border rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 py-1">
                  <Link href={"/portfolios/" + currentPortfolioId + "/tools/rebalance"} className={dropdownLinkClass("/portfolios/" + currentPortfolioId + "/tools/rebalance")}>Ребалансировка</Link>
                  <Link href={"/portfolios/" + currentPortfolioId + "/tools/top-dividend"} className={dropdownLinkClass("/portfolios/" + currentPortfolioId + "/tools/top-dividend")}>Топ дивидендных акций</Link>
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