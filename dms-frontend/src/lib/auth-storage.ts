import type { LoginResult } from "@/types/auth";

const STORAGE_KEY = "dms.session";

/**
 * sessionStorage rather than localStorage, deliberately. There is no refresh token and no
 * server-side revocation list (see the backend README's known gaps) — the bearer token is
 * valid until it expires, full stop. sessionStorage at least clears when the tab closes,
 * which shrinks the window a copied token is useful in. It still survives a same-tab refresh,
 * so signing in doesn't get undone by pressing F5.
 */
export function saveSession(session: LoginResult): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

/** Returns null for a missing, corrupt, or expired session rather than throwing. */
export function loadSession(): LoginResult | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as LoginResult;

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
