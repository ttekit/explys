/** Client-side profile UI (notifications, autoplay, subtitles) until backend storage exists. */

export type NotificationPrefs = {
  dailyReminder: boolean;
  weeklyReport: boolean;
  achievements: boolean;
  newContent: boolean;
  marketing: boolean;
};

export type ProfileUiPrefs = {
  notifications: NotificationPrefs;
  autoplayNext: boolean;
  showSubtitles: boolean;
};

const DEFAULT_NOTIFICATIONS: NotificationPrefs = {
  dailyReminder: true,
  weeklyReport: true,
  achievements: true,
  newContent: false,
  marketing: false,
};

const DEFAULT_PREFS: ProfileUiPrefs = {
  notifications: { ...DEFAULT_NOTIFICATIONS },
  autoplayNext: true,
  showSubtitles: true,
};

function keyFor(userId: string): string {
  return `exply_profile_ui_v1:${userId}`;
}

export function loadProfileUiPrefs(userId: string): ProfileUiPrefs {
  if (!userId.trim()) {
    return { ...DEFAULT_PREFS, notifications: { ...DEFAULT_NOTIFICATIONS } };
  }
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) {
      return { ...DEFAULT_PREFS, notifications: { ...DEFAULT_NOTIFICATIONS } };
    }
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_PREFS, notifications: { ...DEFAULT_NOTIFICATIONS } };
    }
    const o = parsed as Record<string, unknown>;
    const n = o.notifications;
    const notifications: NotificationPrefs = {
      ...DEFAULT_NOTIFICATIONS,
      ...(typeof n === "object" && n !== null ? (n as NotificationPrefs) : {}),
    };
    return {
      notifications,
      autoplayNext:
        typeof o.autoplayNext === "boolean"
          ? o.autoplayNext
          : DEFAULT_PREFS.autoplayNext,
      showSubtitles:
        typeof o.showSubtitles === "boolean"
          ? o.showSubtitles
          : DEFAULT_PREFS.showSubtitles,
    };
  } catch {
    return { ...DEFAULT_PREFS, notifications: { ...DEFAULT_NOTIFICATIONS } };
  }
}

export function saveProfileUiPrefs(userId: string, prefs: ProfileUiPrefs): void {
  if (!userId.trim()) return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(prefs));
  } catch {
    /* quota / private mode */
  }
}
