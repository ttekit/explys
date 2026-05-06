import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  BarChart3,
  BookOpen,
  Clock,
  GraduationCap,
  Settings,
  Trophy,
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
import { ProfileActivity } from "../../components/profile/ProfileActivity";
import { ProfileSettings } from "../../components/profile/ProfileSettings";
import { ProfileTeacherStudents } from "../../components/profile/ProfileTeacherStudents";
import { CatalogSidebar } from "../../components/catalog/CatalogSidebar";

const LEARNER_TABS = [
  { id: "overview" as const, label: "Overview", icon: BarChart3 },
  { id: "progress" as const, label: "Progress", icon: BookOpen },
  { id: "achievements" as const, label: "Achievements", icon: Trophy },
  { id: "activity" as const, label: "Activity", icon: Clock },
  { id: "settings" as const, label: "Settings", icon: Settings },
];

type TabId =
  | (typeof LEARNER_TABS)[number]["id"]
  | "students";

const LEARNER_TAB_IDS = new Set(LEARNER_TABS.map((t) => t.id));

function tabFromSearchParam(raw: string | null, isTeacher: boolean): TabId {
  if (!raw) return "overview";
  if (raw === "students") return isTeacher ? "students" : "overview";
  if (LEARNER_TAB_IDS.has(raw as (typeof LEARNER_TABS)[number]["id"])) {
    return raw as TabId;
  }
  return "overview";
}

function normalizeRole(role: string): ProfileHeaderRole {
  if (role === "student" || role === "teacher") return role;
  return "adult";
}

type LearningStatsPayload = {
  totalWatchTimeMin: number;
  videosCompleted: number;
  testsCompleted: number;
  averageScore: number | null;
  weeklyActivity: { day: string; minutes: number }[];
};

export default function ProfileMain() {
  const { user, isLoading, isLoggedIn, refreshProfile } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = useMemo(
    () =>
      tabFromSearchParam(
        searchParams.get("tab"),
        user?.role === "teacher",
      ),
    [searchParams, user?.role],
  );
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
        label: d.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || activeTab !== "overview") return;
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
      level: user.englishLevel?.trim() || "—",
      joinDateLabel,
      streakDays: null,
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
      levelLabel: user.englishLevel?.trim() || "A1",
    };
  }, [user, learningStats]);

  const tabs = useMemo(() => {
    if (user?.role === "teacher") {
      return [
        LEARNER_TABS[0],
        {
          id: "students" as const,
          label: "Students",
          icon: GraduationCap,
        },
        ...LEARNER_TABS.slice(1),
      ];
    }
    return [...LEARNER_TABS];
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== "teacher" && searchParams.get("tab") === "students") {
      setSearchParams({}, { replace: true });
    }
  }, [user?.role, searchParams, setSearchParams]);

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        Loading profile…
      </div>
    );
  }

  if (!isLoggedIn || !user || !headerModel || !statsModel) {
    return (
      <div className="m-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-destructive">
        <p className="font-medium">Please sign in to view your profile.</p>
        <Link
          to="/loginForm"
          className="mt-3 inline-block text-primary underline-offset-4 hover:underline"
        >
          Go to login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <div className="flex">
        <CatalogSidebar
          categories={[]}
          selectedCategory="All"
          onSelectCategory={() => {}}
          showCategoryFilter={false}
          welcomeName={
            user.name?.trim() ? user.name.trim().split(/\s+/)[0] : undefined
          }
          englishLevel={user.englishLevel?.trim() || undefined}
        />

        <main className="ml-0 flex-1 pb-28 lg:ml-64 lg:pb-12">
          <div className="space-y-6 px-4 pt-6 sm:px-6 lg:space-y-8 lg:px-8 lg:pt-8">
            <ProfileHeader user={headerModel} />

            <div
              className="flex flex-wrap gap-1 rounded-xl bg-secondary/50 p-1"
              role="tablist"
              aria-label="Profile sections"
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
                    onClick={() => {
                      if (tab.id === "overview") {
                        setSearchParams({}, { replace: true });
                      } else {
                        setSearchParams({ tab: tab.id }, { replace: true });
                      }
                    }}
                    className={cn(
                      "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors sm:flex-none sm:justify-start",
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

            <div className="mx-auto max-w-6xl lg:mx-0">
              <div className="mt-2">
                {activeTab === "overview" ? (
                  <ProfileStats user={statsModel} />
                ) : null}
                {activeTab === "students" ? <ProfileTeacherStudents /> : null}
                {activeTab === "progress" ? <ProfileProgress /> : null}
                {activeTab === "achievements" ? (
                  <ProfileAchievements />
                ) : null}
                {activeTab === "activity" ? <ProfileActivity /> : null}
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
          </div>
        </main>
      </div>
    </div>
  );
}
