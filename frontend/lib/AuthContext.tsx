"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { API_URL } from "./api";
import { type AuthTokens, clearTokens, loadTokens, saveTokens } from "./auth";

interface AuthContextValue {
  tokens: AuthTokens | null;
  // true, когда мы уже проверили localStorage (до этого нельзя решать, редиректить на /login или нет).
  isReady: boolean;
  login: (tokens: AuthTokens) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setTokens(loadTokens());
    setIsReady(true);
  }, []);

  function login(newTokens: AuthTokens) {
    saveTokens(newTokens);
    setTokens(newTokens);
  }

  function logout() {
    clearTokens();
    setTokens(null);
  }

  return (
    <AuthContext.Provider value={{ tokens, isReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен вызываться внутри <AuthProvider>");
  return ctx;
}

/**
 * fetch с автоматической подстановкой Bearer-токена. При 401 один раз пробует
 * обновиться через refresh token; если не вышло — разлогинивает.
 */
export function useAuthFetch() {
  const { tokens, login, logout } = useAuth();

  return async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
    if (!tokens) {
      throw new Error("Нет активной сессии");
    }

    const request = (accessToken: string) =>
      fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
          // Для FormData (загрузка файлов) Content-Type НЕ ставим — браузер сам
          // проставит multipart/form-data с правильным boundary.
          ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
          Authorization: `Bearer ${accessToken}`,
        },
      });

    let response = await request(tokens.accessToken);

    if (response.status === 401) {
      const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });

      if (!refreshResponse.ok) {
        logout();
        return response;
      }

      const refreshed: AuthTokens = await refreshResponse.json();
      login(refreshed);
      response = await request(refreshed.accessToken);
    }

    return response;
  };
}
