import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Clock,
  CreditCard,
  GraduationCap,
  Settings,
  Trophy,
  Video,
} from "lucide-react";
import { apiFetch } from "../../lib/api";
import { useUser } from "../../context/UserContext";
import { cn } from "../../lib/utils";
import type {
  ProfileHeaderModel,
  ProfileHeaderRole,
} from "../../components/profile/ProfileHeader";
import { ProfileHeader } from "../../components/profile/ProfileHeader";
import {
  DEFAULT_WEEKLY_ACTIVITY,
  type ProfileStatsModel,
} from "../../components/profile/ProfileStats";
import { ProfileStats } from "../../components/profile/ProfileStats";
import { ProfileProgress } from "../../components/profile/ProfileProgress";
import { ProfileAchievements } from "../../components/profile/ProfileAchievements";
import {
  ProfileActivity,
  type ActivityHistoryItem,
} from "../../components/profile/ProfileActivity";
import { ProfileSettings } from "../../components/profile/ProfileSettings";
import { ProfileTeacherStudents } from "../../components/profile/ProfileTeacherStudents";
import { ProfileTeacherVideos } from "../../components/profile/ProfileTeacherVideos";
import { ProfileStudyingPlan } from "../../components/profile/ProfileStudyingPlan";
import { ProfileSubscriptions } from "../../components/profile/ProfileSubscriptions";
import { CatalogSidebar } from "../../components/catalog/CatalogSidebar";
import { SEO } from "../../components/SEO/SEO";
import { resolveCanonicalUrl } from "../../lib/siteUrl";
import { useLandingLocale } from "../../context/LandingLocaleContext";

type TabId = (typeof LEARNER_TAB_IDS)[number]["id"] | "students" | "videos";

const LEARNER_TAB_IDS = [
  { id: "overview" as const, icon: BarChart3 },
  { id: "studying-plan" as const, icon: ClipboardList },
  { id: "subscriptions" as const, icon: CreditCard },
  { id: "progress" as const, icon: BookOpen },
  { id: "achievements" as const, icon: Trophy },
  { id: "activity" as const, icon: Clock },
  { id: "settings" as const, icon: Settings },
] as const;

function normalizeRole(role: string): ProfileHeaderRole {
  const k = role.trim().toLowerCase();
  if (k === "student" || k === "teacher" || k === "admin") return k;
  return "adult";
}

type LearningStatsPayload = {
  totalWatchTimeMin: number;
  videosCompleted: number;
  testsCompleted: number;
  averageScore: number | null;
  weeklyActivity: { day: string; minutes: number }[];
  thisWeekVideosWatched: number;
  thisWeekQuizzesPassed: number;
  thisWeekWordsLearned: number;
  thisWeekAverageScore: number | null;
  bestQuiz: { title: string; scorePct: number } | null;
  activityHistory: ActivityHistoryItem[];
  weeklyReview: {
    weekStart: string;
    lessonCount: number;
    lessonTitles: string[];
    eligible: boolean;
    completedThisWeek: boolean;
    lastScorePct: number | null;
  } | null;
};

function coerceFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseBestQuizFromPayload(
  raw: unknown,
): LearningStatsPayload["bestQuiz"] {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const b = raw as Record<string, unknown>;
  const scorePct = coerceFiniteNumber(b.scorePct);
  if (scorePct == null) {
    return null;
  }
  const titleRaw = b.title;
  const title = typeof titleRaw === "string" ? titleRaw.trim() : "";
  return {
    title,
    scorePct: Math.round(scorePct * 10) / 10,
  };
}

export default function ProfileMain() {
  const { user, isLoading, isLoggedIn, refreshProfile } = useUser();
  const { messages, locale } = useLandingLocale();
  const p = messages.profile;
  const headerLocale = locale === "uk" ? "uk-UA" : "en-US";
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [joinMeta, setJoinMeta] = useState<{
    userId: string;
    label: string;
  } | null>(null);
  const [learningStats, setLearningStats] =
    useState<LearningStatsPayload | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    let cancelled = false;
    void (async () => {
      const r = await apiFetch(`/users/${Number(uid)}`, {
        method: "GET",
      });
      if (!r.ok || cancelled) return;
      const j: unknown = await r.json();
      if (!j || typeof j !== "object") return;
      const createdAt = (j as { createdAt?: unknown }).createdAt;
      if (typeof createdAt !== "string") return;
      const d = new Date(createdAt);
      if (Number.isNaN(d.getTime()) || cancelled) return;
      setJoinMeta({
        userId: uid,
        label: d.toLocaleDateString(headerLocale, {
          month: "long",
          year: "numeric",
        }),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, headerLocale]);

  useEffect(() => {
    if (!user?.id || (activeTab !== "overview" && activeTab !== "activity"))
      return;
    let cancelled = false;
    void (async () => {
      const r = await apiFetch("/auth/profile/learning-stats", {
        method: "GET",
      });
      if (!r.ok || cancelled) {
        if (!cancelled) setLearningStats(null);
        return;
      }
      const raw: unknown = await r.json();
      if (!raw || typeof raw !== "object" || cancelled) return;
      const o = raw as Record<string, unknown>;
      const weekly = o.weeklyActivity;
      const rawHistory = o.activityHistory;
      const activityHistory: ActivityHistoryItem[] = Array.isArray(rawHistory)
        ? rawHistory.filter(
            (row): row is ActivityHistoryItem =>
              row != null &&
              typeof row === "object" &&
              typeof (row as { kind?: unknown }).kind === "string" &&
              typeof (row as { at?: unknown }).at === "string",
          )
        : [];
      const bestQuiz = parseBestQuizFromPayload(o.bestQuiz);
      const wAvg = o.thisWeekAverageScore;
      let weeklyReview: LearningStatsPayload["weeklyReview"] = null;
      const wr = o.weeklyReview;
      if (wr && typeof wr === "object" && !Array.isArray(wr)) {
        const wrO = wr as Record<string, unknown>;
        const titlesRaw = wrO.lessonTitles;
        const lessonTitles = Array.isArray(titlesRaw)
          ? titlesRaw
              .filter((x): x is string => typeof x === "string")
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
          : [];
        const ls = wrO.weekStart;
        weeklyReview = {
          weekStart: typeof ls === "string" ? ls : "",
          lessonCount: Number(wrO.lessonCount ?? 0) || 0,
          lessonTitles,
          eligible: wrO.eligible === true,
          completedThisWeek: wrO.completedThisWeek === true,
          lastScorePct:
            wrO.lastScorePct === null || wrO.lastScorePct === undefined ?
              null
            : Number(wrO.lastScorePct),
        };
      }
      setLearningStats({
        totalWatchTimeMin: Number(o.totalWatchTimeMin ?? 0) || 0,
        videosCompleted: Number(o.videosCompleted ?? 0) || 0,
        testsCompleted: Number(o.testsCompleted ?? 0) || 0,
        averageScore:
          o.averageScore === null || o.averageScore === undefined
            ? null
            : Number(o.averageScore),
        weeklyActivity: Array.isArray(weekly)
          ? (weekly as { day: string; minutes: number }[])
          : [...DEFAULT_WEEKLY_ACTIVITY],
        thisWeekVideosWatched: Number(o.thisWeekVideosWatched ?? 0) || 0,
        thisWeekQuizzesPassed: Number(o.thisWeekQuizzesPassed ?? 0) || 0,
        thisWeekWordsLearned: Number(o.thisWeekWordsLearned ?? 0) || 0,
        thisWeekAverageScore:
          wAvg === null || wAvg === undefined ? null : Number(wAvg),
        bestQuiz,
        activityHistory,
        weeklyReview,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, activeTab]);

  const joinDateLabel =
    user?.id && joinMeta?.userId === user.id ? joinMeta.label : null;

  const headerModel: ProfileHeaderModel | null = useMemo(() => {
    if (!user) return null;
    return {
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: normalizeRole(user.role),
      level: user.englishLevel?.trim() || p.levelDash,
      joinDateLabel,
      streakDays: (user as any).currentStreak || 0,
    };
  }, [user, joinDateLabel]);

  const statsModel: ProfileStatsModel | null = useMemo(() => {
    if (!user) return null;
    const s = learningStats;
    return {
      totalWatchTimeMin: s?.totalWatchTimeMin ?? 0,
      videosCompleted: s?.videosCompleted ?? 0,
      testsCompleted: s?.testsCompleted ?? 0,
      averageScore:
        s?.averageScore != null && Number.isFinite(s.averageScore)
          ? s.averageScore
          : null,
      weeklyActivity: s?.weeklyActivity ?? [...DEFAULT_WEEKLY_ACTIVITY],
      levelLabel: user.englishLevel?.trim() || p.levelLabelFallback,
      xp: user.xp || 0,
      appLevel: Math.floor((user.xp || 0) / 1000) + 1,
    };
  }, [user, learningStats]);

  const tabs = useMemo(() => {
    const base = LEARNER_TAB_IDS.map((row) => ({
      id: row.id,
      icon: row.icon,
      label:
        row.id === "overview" ? p.tabOverview
        : row.id === "studying-plan" ? p.tabStudyingPlan
        : row.id === "subscriptions" ? p.tabSubscriptions
        : row.id === "progress" ? p.tabProgress
        : row.id === "achievements" ? p.tabAchievements
        : row.id === "activity" ? p.tabActivity
        : p.tabSettings,
    }));
    if (user?.role === "teacher") {
      const withoutStudying = base.filter(
        (t) => t.id !== "studying-plan",
      );
      return [
        withoutStudying[0],
        {
          id: "students" as const,
          label: p.tabStudents,
          icon: GraduationCap,
        },
        {
          id: "videos" as const,
          label: p.tabVideos,
          icon: Video,
        },
        ...withoutStudying.slice(1),
      ];
    }
    return base;
  }, [p, user?.role]);

  useEffect(() => {
    if (!user) return;
    const t = searchParams.get("tab");
    const validIds = new Set<string>(tabs.map((tb) => tb.id));
    if (t && validIds.has(t)) {
      setActiveTab(t as TabId);
      return;
    }
    if (t && !validIds.has(t)) {
      setActiveTab("overview");
      setSearchParams({}, { replace: true });
      return;
    }
    if (!t) setActiveTab("overview");
  }, [user, searchParams, tabs, setSearchParams]);

  useEffect(() => {
    if (user?.role !== "teacher" && activeTab === "students") {
      setActiveTab("overview");
      setSearchParams({}, { replace: true });
    }
  }, [user?.role, activeTab, setSearchParams]);

  useEffect(() => {
    if (user?.role !== "teacher" && activeTab === "videos") {
      setActiveTab("overview");
      setSearchParams({}, { replace: true });
    }
  }, [user?.role, activeTab, setSearchParams]);

  useEffect(() => {
    if (user?.role === "teacher" && activeTab === "studying-plan") {
      setActiveTab("overview");
      setSearchParams({}, { replace: true });
    }
  }, [user?.role, activeTab, setSearchParams]);

  if (isLoading) {
    return (
      <>
        <SEO
          title={p.seoTitle}
          description={p.seoDescription}
          canonicalUrl={resolveCanonicalUrl("/profileMain")}
          noindex
        />
        <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
          {p.loading}
        </div>
      </>
    );
  }

  if (!isLoggedIn || !user || !headerModel || !statsModel) {
    return (
      <>
        <SEO
          title={p.seoTitle}
          description={p.seoDescription}
          canonicalUrl={resolveCanonicalUrl("/profileMain")}
          noindex
        />
        <div className="m-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-destructive">
          <p className="font-medium">{p.signInPrompt}</p>
          <Link
            to="/loginForm"
            className="mt-3 inline-block text-primary underline-offset-4 hover:underline"
          >
            {p.goToLogin}
          </Link>
        </div>
      </>
    );
  }

  function selectTab(id: TabId) {
    setActiveTab(id);
    if (id === "overview") setSearchParams({}, { replace: true });
    else setSearchParams({ tab: id }, { replace: true });
  }

  return (
    <div className="min-h-dvh bg-background font-display antialiased">
      <SEO
        title={p.seoTitle}
        description={p.seoDescription}
        canonicalUrl={resolveCanonicalUrl("/profileMain")}
        noindex
      />
      <div className="flex">
        <CatalogSidebar
          categories={[]}
          selectedCategory="All"
          onSelectCategory={() => {}}
          onSelectLevel={() => { }}
          reserveTopNavSpace={false}
          welcomeName={
            user?.name?.trim() ? user.name.trim().split(/\s+/)[0] : undefined
          }
          englishLevel={user?.englishLevel || undefined}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />

        <main
          className={cn(
            "flex-1 pb-24 pt-6 transition-all duration-300 sm:px-6 lg:pb-12 lg:pt-8",
            sidebarCollapsed ? "lg:ml-20" : "lg:ml-64",
          )}
        >
          <div className="mx-auto max-w-6xl px-4 lg:px-8">
            <ProfileHeader user={headerModel} />

            <div
              className="mt-8 flex flex-wrap gap-1 rounded-xl bg-secondary/50 p-1"
              role="tablist"
              aria-label={p.tabListAria}
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => selectTab(tab.id)}
                    className={cn(
                      "inline-flex hover:cursor-pointer flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors sm:flex-none sm:justify-start",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              {activeTab === "overview" ? (
                <ProfileStats user={statsModel} />
              ) : null}
              {activeTab === "studying-plan" ? (
                <ProfileStudyingPlan user={user} />
              ) : null}
              {activeTab === "subscriptions" ? (
                <ProfileSubscriptions user={user} />
              ) : null}
              {activeTab === "students" ? <ProfileTeacherStudents /> : null}
              {activeTab === "videos" ? <ProfileTeacherVideos /> : null}
              {activeTab === "progress" ? <ProfileProgress /> : null}
              {activeTab === "achievements" ? <ProfileAchievements /> : null}
              {activeTab === "activity" ? (
                <ProfileActivity
                  weeklyActivity={learningStats?.weeklyActivity}
                  activityHistory={learningStats?.activityHistory}
                  thisWeekVideosWatched={learningStats?.thisWeekVideosWatched}
                  thisWeekQuizzesPassed={
                    learningStats?.thisWeekQuizzesPassed
                  }
                  thisWeekWordsLearned={learningStats?.thisWeekWordsLearned}
                  thisWeekAverageScore={
                    learningStats?.thisWeekAverageScore
                  }
                  bestQuiz={learningStats?.bestQuiz}
                  weeklyReview={learningStats?.weeklyReview ?? null}
                />
              ) : null}
              {activeTab === "settings" ? (
                <ProfileSettings
                  user={user}
                  onSaved={async () => {
                    await refreshProfile();
                  }}
                />
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
