"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";

export function Navbar() {
  const pathname = usePathname();
  const { tokens, logout, isReady } = useAuth();

  // Не показываем навбар на страницах авторизации
  if (!isReady || !tokens) return null;

  const navLinks = [
    { href: "/portfolios", label: "Портфели" },
    { href: "/market", label: "Инструменты" },
  ];

  return (
    <nav className="border-b border-surface-border bg-surface px-6 py-3 flex items-center justify-between z-10 sticky top-0">
      <div className="flex items-center gap-8">
        <Link href="/" className="font-[family-name:var(--font-display)] font-semibold text-lg text-foreground tracking-wide">
          MyBroker<span className="text-accent">AI</span>
        </Link>
        <div className="hidden md:flex gap-6">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
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
