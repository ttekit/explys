const KEY = "eng_curses_registration_draft";

export function readRegistrationDraft(): unknown {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function writeRegistrationDraft(data: object) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* private mode / quota */
  }
}

export function clearRegistrationDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
