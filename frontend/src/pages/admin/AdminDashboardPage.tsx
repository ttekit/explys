import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Clock,
  Play,
  Target,
  TrendingUp,
  Users,
  Video,
} from "lucide-react";
import { ChameleonMascot } from "../../components/ChameleonMascot";
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminCardContent,
  AdminCardHeader,
  AdminCardTitle,
  AdminProgress,
} from "../../components/admin/adminUi";
import type {
  AdminAnalyticsOverviewDto,
  RecentActivityItemDto,
} from "../../lib/adminAnalyticsApi";
import {
  defaultAnalyticsRange,
  fetchAdminOverview,
  fetchRecentActivity,
  fetchUserGrowth,
  formatCompactNumber,
  relativeTimeShort,
  type UserGrowthPointDto,
} from "../../lib/adminAnalyticsApi";

function activityVisual(kind: string) {
  if (
    kind === "placement_completed" ||
    kind === "comprehension_test_submitted"
  ) {
    return "test" as const;
  }
  if (kind === "user_registered") return "user" as const;
  return "video" as const;
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<AdminAnalyticsOverviewDto | null>(
    null,
  );
  const [growth, setGrowth] = useState<UserGrowthPointDto[]>([]);
  const [activity, setActivity] = useState<RecentActivityItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { from, to } = defaultAnalyticsRange();
    void (async () => {
      setError(null);
      try {
        const [ov, gr, act] = await Promise.all([
          fetchAdminOverview(from, to),
          fetchUserGrowth(from, to, "day"),
          fetchRecentActivity(12),
        ]);
        if (!cancelled) {
          setOverview(ov);
          setGrowth(gr);
          setActivity(act);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load analytics");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    if (!overview) return [];
    const surveyPct =
      overview.surveySubmissionRatePct != null
        ? `${Math.round(overview.surveySubmissionRatePct * 10) / 10}%`
        : "—";

    type Stat = {
      title: string;
      value: string;
      change: string;
      trend: "up" | "down";
      icon: typeof Users;
    };

    const out: Stat[] = [
      {
        title: "Total users",
        value: overview.totalUsers.toLocaleString(),
        change: "+0%",
        trend: "up",
        icon: Users,
      },
      {
        title: "Catalog videos",
        value: overview.totalContentVideos.toLocaleString(),
        change: "+0%",
        trend: "up",
        icon: Video,
      },
      {
        title: "Watch hours",
        value: `${formatCompactNumber(overview.watchHours)} h`,
        change: "+0%",
        trend: "up",
        icon: Clock,
      },
      {
        title: "Survey submit rate",
        value: surveyPct,
        change: "+0%",
        trend:
          overview.surveySubmissionRatePct != null &&
          overview.surveySubmissionRatePct >= 50
            ? "up"
            : "down",
        icon: Target,
      },
    ];
    return out;
  }, [overview]);

  const growthChartData = useMemo(
    () =>
      growth.map((g) => ({
        label: new Date(g.periodStart).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        users: g.cumulativeUsers,
        newUsers: g.newUsers,
      })),
    [growth],
  );

  const surveyPctValue = overview?.surveySubmissionRatePct ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Live metrics from{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              /admin/analytics
            </code>{" "}
            (past 30 days by default).
          </p>
        </div>
        <div className="hidden gap-3 md:flex">
          <AdminButton variant="outline">Export report</AdminButton>
          <AdminButton>Add video</AdminButton>
        </div>
      </div>

      {error ? (
        <AdminCard className="border-destructive/40">
          <AdminCardContent className="space-y-2 p-6 text-sm">
            <p className="font-medium text-destructive">Analytics unavailable</p>
            <p className="text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">
              Set matching <strong>VITE_API_TOKEN</strong> and{" "}
              <strong>API_TOKEN</strong> and ensure migrations have run.
            </p>
          </AdminCardContent>
        </AdminCard>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <AdminCard key={stat.title}>
            <AdminCardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${stat.trend === "up" ? "text-accent" : "text-destructive"}`}
                >
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  <span title="Period-over-period trend not wired yet">
                    —
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </div>
            </AdminCardContent>
          </AdminCard>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard>
          <AdminCardHeader className="border-border border-b">
            <AdminCardTitle>User growth (cumulative)</AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent className="p-6">
            <div className="h-[300px]">
              {growthChartData.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  No signup data in this window.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthChartData}>
                    <defs>
                      <linearGradient
                        id="userGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="oklch(0.65 0.25 295)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="100%"
                          stopColor="oklch(0.65 0.25 295)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="label"
                      stroke="oklch(0.7 0.02 285)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="oklch(0.7 0.02 285)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.18 0.03 285)",
                        border: "1px solid oklch(0.28 0.04 285)",
                        borderRadius: "8px",
                        color: "oklch(0.98 0 0)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="oklch(0.65 0.25 295)"
                      strokeWidth={2}
                      fill="url(#userGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </AdminCardContent>
        </AdminCard>

        <AdminCard>
          <AdminCardHeader className="border-border border-b">
            <AdminCardTitle>Quiz & placement (same window)</AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent className="space-y-4 p-6">
            {!overview ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
                    <BookOpen className="h-4 w-4" /> Comprehension
                  </div>
                  <p className="mt-2 font-display text-3xl font-bold text-foreground">
                    {overview.comprehensionAttemptsInRange}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    attempts · avg{" "}
                    {overview.comprehensionAvgScorePct != null
                      ? `${overview.comprehensionAvgScorePct}%`
                      : "—"}
                    · pass{" "}
                    {overview.comprehensionPassRatePct != null
                      ? `${overview.comprehensionPassRatePct}%`
                      : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
                    <TrendingUp className="h-4 w-4" /> Placement completions
                  </div>
                  <p className="mt-2 font-display text-3xl font-bold text-foreground">
                    {overview.placementCompletionsInRange}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Entry tests marked complete in backend.
                  </p>
                </div>
              </>
            )}
          </AdminCardContent>
        </AdminCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <AdminCard className="lg:col-span-2">
          <AdminCardHeader className="flex flex-row items-center justify-between border-border border-b">
            <AdminCardTitle>Recent activity</AdminCardTitle>
            <AdminBadge variant="outline">{activity.length || 0} items</AdminBadge>
          </AdminCardHeader>
          <AdminCardContent className="space-y-4 p-6">
            {activity.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                No learner events logged yet — watch completions and quizzes
                will appear here once data exists.
              </p>
            ) : (
              activity.map((item, idx) => {
                const viz = activityVisual(item.kind);
                return (
              <div
                key={`${item.kind}-${item.userId}-${item.at}-${idx}`}
                className="flex items-center gap-4 rounded-lg bg-muted/50 p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  {viz === "video" ? (
                    <Play className="h-5 w-5 text-primary" />
                  ) : viz === "user" ? (
                    <Users className="h-5 w-5 text-primary" />
                  ) : (
                    <BookOpen className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{item.userLabel}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                  <p className="text-xs text-muted-foreground">
                    {relativeTimeShort(item.at)}
                  </p>
                </div>
              </div>
                );
              })
            )}
          </AdminCardContent>
        </AdminCard>

        <AdminCard>
          <AdminCardHeader className="border-border border-b">
            <AdminCardTitle>Lesson pipeline</AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent className="space-y-6 p-6">
            {!overview ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Watch completions</span>
                    <span className="font-medium">{overview.watchCompletionsInRange}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Distinct watchers</span>
                    <span className="font-medium">
                      {overview.distinctWatchLearnersInRange}
                    </span>
                  </div>
                  <AdminProgress value={surveyPctValue} />
                  <p className="text-xs text-muted-foreground">
                    Post-watch survey submits vs. surveys issued (completion proxy).
                  </p>
                </div>
              </>
            )}
          </AdminCardContent>
        </AdminCard>
      </div>

      <AdminCard className="border-primary/20 bg-gradient-to-r from-primary/10 to-accent/10">
        <AdminCardContent className="flex items-start gap-4 p-6 sm:items-center">
          <ChameleonMascot size="md" mood="thinking" />
          <div>
            <h3 className="font-semibold text-foreground">Pro tip</h3>
            <p className="text-sm text-muted-foreground">
              Shorter clips under ~10 minutes often see stronger completion rates.
              Chunk longer content when you publish.
            </p>
          </div>
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}
