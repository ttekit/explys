import type { AuthSession } from "./types";

const KEY = "eng_curses_test_session_v1";

/** Dispatched on same-tab session updates (login/register/logout). */
export const SESSION_CHANGE_EVENT = "eng_curses_session_change";

function dispatchSessionChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as AuthSession;
    if (!p?.access_token || !p?.user?.id) return null;
    return p;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession): void {
  localStorage.setItem(KEY, JSON.stringify(session));
  dispatchSessionChange();
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
  dispatchSessionChange();
}
