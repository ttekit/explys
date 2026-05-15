import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { apiFetch, setStoredAccessToken } from "../lib/api";
import { identifyLearner, resetAnalytics } from "../lib/analytics";

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  hasCompletedPlacement: boolean;
  englishLevel: string;
  hobbies: string[];
  education: string;
  workField: string;
  /** First language / L1 — used for personalization and placement context. */
  nativeLanguage: string;
  favoriteGenres: number[];
  hatedGenres: number[];
  avatarUrl?: string;
  /** From `UserSettings.playbackSpeed` */
  playbackSpeed?: number | null;
  /** From `UserSettings.currentResolution` (e.g. auto, 720p) */
  videoQuality?: string;
  /** Adult profile: motivation (e.g. travel). */
  learningGoal?: string;
  /** Adult profile: target horizon. */
  timeToAchieve?: string;
  /** Saved studying-plan JSON v2 (`additional_user_data.studying_plan_phases`). */
  studyingPlanPhases?: unknown;
  /** ISO timestamp when the user entered the current phase (phase-scoped tasks). */
  activePhaseEnteredAt?: string | null;
  /** 0-based active phase (clamped client-side to phase count). */
  activeStudyingPhaseIndex?: number;
  /** Stripe: light | smart | family */
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  stripeSubscriptionId?: string;
  /** Set when this account is a roster student under a teacher (exempt from consumer subscription). */
  teacherId?: number | null;
  currentStreak: number;
  xp: number;
  level: number;
  achievements: string[];
  /**
   * When true, next comprehension quiz is generated as remediation toward recent misses.
   * From JWT profile `GET /auth/profile`.
   */
  errorFixingTestPending?: boolean;
}

/** Registration used `"choose"` as a sentinel for unfilled selects; strip so UI shows blanks. */
function stripChoosePlaceholder(raw: unknown): string {
  const s = String(raw ?? "").trim();
  return s.toLowerCase() === "choose" ? "" : s;
}

function coerceHasCompletedPlacement(raw: unknown): boolean {
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0 || raw == null) return false;
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    return s === "true" || s === "1";
  }
  return false;
}

function normalizeLearnerRole(raw: unknown): string {
  const s = String(raw ?? "adult").trim().toLowerCase();
  return s.length > 0 ? s : "adult";
}

function normalizeProfile(raw: unknown): UserData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    email: String(r.email ?? ""),
    role: normalizeLearnerRole(r.role),
    hasCompletedPlacement: coerceHasCompletedPlacement(r.hasCompletedPlacement),
    englishLevel: String(r.englishLevel ?? ""),
    education: stripChoosePlaceholder(r.education),
    workField: stripChoosePlaceholder(r.workField),
    nativeLanguage: stripChoosePlaceholder(r.nativeLanguage),
    hobbies: Array.isArray(r.hobbies) ? (r.hobbies as string[]) : [],
    favoriteGenres: Array.isArray(r.favoriteGenres)
      ? (r.favoriteGenres as number[])
      : [],
    hatedGenres: Array.isArray(r.hatedGenres)
      ? (r.hatedGenres as number[])
      : [],
    avatarUrl: typeof r.avatarUrl === "string" ? r.avatarUrl : undefined,
    playbackSpeed: (() => {
      const v = r.playbackSpeed;
      if (v === null || v === undefined) return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    })(),
    videoQuality:
      typeof r.videoQuality === "string" ? r.videoQuality : "",
    learningGoal:
      typeof r.learningGoal === "string" ? r.learningGoal : "",
    timeToAchieve:
      typeof r.timeToAchieve === "string" ? r.timeToAchieve : "",
    studyingPlanPhases:
      r.studyingPlanPhases !== undefined && r.studyingPlanPhases !== null
        ? r.studyingPlanPhases
        : undefined,
    activePhaseEnteredAt:
      typeof r.activePhaseEnteredAt === "string" ?
        r.activePhaseEnteredAt
      : r.activePhaseEnteredAt === null ?
        null
      : undefined,
    activeStudyingPhaseIndex: (() => {
      const v = r.activeStudyingPhaseIndex;
      if (v === null || v === undefined) return undefined;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : undefined;
    })(),
    subscriptionPlan:
      typeof r.subscriptionPlan === "string" ? r.subscriptionPlan : "",
    subscriptionStatus:
      typeof r.subscriptionStatus === "string" ? r.subscriptionStatus : "",
    stripeSubscriptionId:
      typeof r.stripeSubscriptionId === "string" ? r.stripeSubscriptionId : "",
    teacherId: (() => {
      const t = r.teacherId;
      if (t === null || t === undefined) return null;
      const n = typeof t === "number" ? t : Number(t);
      return Number.isFinite(n) ? n : null;
    })(),
    currentStreak: Number(r.currentStreak) || 0,
    xp: Number(r.xp) || 0,
    level: Number(r.level) || 1,
    achievements: Array.isArray(r.achievements) ? r.achievements : [],
    errorFixingTestPending:
      r.errorFixingTestPending === true || r.errorFixingTestPending === 1,
  };
}

interface UserContextType {
  user: UserData | null;
  login: (data: UserData) => void;
  logout: () => void;
  refreshProfile: () => Promise<UserData | null>;
  isLoggedIn: boolean;
  isLoading: boolean;
}

export const UserContext = createContext<UserContextType | undefined>(
  undefined,
);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async (): Promise<UserData | null> => {
    const response = await apiFetch("/auth/profile", { method: "GET" });
    if (!response.ok) {
      setUser(null);
      return null;
    }
    const data: unknown = await response.json();
    const next = normalizeProfile(data);
    setUser(next);
    return next;
  }, []);

  const login = (data: UserData) => {
    setUser(data);
  };

  const logout = useCallback(() => {
    resetAnalytics();
    setUser(null);
    setStoredAccessToken(null);
  }, []);

  useEffect(() => {
    if (user?.id?.trim()) {
      identifyLearner(user.id.trim(), {
        role: user.role ?? "unknown",
      });
    }
  }, [user]);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        await refreshProfile();
      } catch (error) {
        console.error("Profile load failed:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [refreshProfile]);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        refreshProfile,
        isLoggedIn: !!user,
        isLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
