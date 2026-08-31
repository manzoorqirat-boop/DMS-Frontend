import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch, registerUnauthorizedHandler, setAuthToken } from "@/lib/api-client";
import { clearSession, loadSession, saveSession } from "@/lib/auth-storage";
import type { LoginResult } from "@/types/auth";

export interface AuthContextValue {
  /** Null while signed out, or before the initial session bootstrap has finished. */
  user: LoginResult | null;
  /** True only during the initial check of sessionStorage on first load. */
  isLoading: boolean;
  login: (userName: string, password: string) => Promise<void>;
  /**
   * Clears the forced-password-change lock after the user has actually changed it. Updates the
   * stored session too, so the lock doesn't reappear on the next page refresh.
   */
  clearPasswordChangeRequirement: () => void;
  logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components -- context object, not a component
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearSession();
    setAuthToken(null);
    setUser(null);
  }, []);

  // Runs once. Restores a still-valid session from sessionStorage so a page refresh doesn't
  // force a re-login within the token's lifetime, and wires the API client's 401 handler to
  // this context's logout — so a token that expires mid-session, discovered by *any* later
  // call anywhere in the app, cleans up the same way a manual sign-out would.
  useEffect(() => {
    const existing = loadSession();
    if (existing) {
      setAuthToken(existing.accessToken);
      setUser(existing);
    }

    registerUnauthorizedHandler(logout);
    setIsLoading(false);
  }, [logout]);

  const clearPasswordChangeRequirement = useCallback(() => {
    setUser((current) => {
      if (!current) {
        return current;
      }

      const updated = { ...current, mustChangePassword: false, passwordChangeReason: null };
      saveSession(updated);
      return updated;
    });
  }, []);

  const login = useCallback(async (userName: string, password: string) => {
    // anonymous: true — this is the one call that must not carry whatever stale token might
    // still be set, since it's the call that's about to establish a new one.
    const result = await apiFetch<LoginResult>("/api/auth/login", {
      method: "POST",
      body: { userName, password },
      anonymous: true,
    });

    setAuthToken(result.accessToken);
    saveSession(result);
    setUser(result);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, login, logout, clearPasswordChangeRequirement }),
    [user, isLoading, login, logout, clearPasswordChangeRequirement],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
