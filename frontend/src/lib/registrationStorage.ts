const KEY = "exply_registration_draft";

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

/** Set before redirect to login after register so the login page can show a one-time welcome toast. */
const PENDING_LOGIN_WELCOME_KEY = "exply_pending_login_welcome";

export function setPendingRegistrationLoginWelcome() {
  try {
    sessionStorage.setItem(PENDING_LOGIN_WELCOME_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function consumePendingRegistrationLoginWelcome(): boolean {
  try {
    if (sessionStorage.getItem(PENDING_LOGIN_WELCOME_KEY) !== "1") {
      return false;
    }
    sessionStorage.removeItem(PENDING_LOGIN_WELCOME_KEY);
    return true;
  } catch {
    return false;
  }
}
