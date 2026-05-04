import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
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
  Download,
  Target,
  Users,
} from "lucide-react";
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminCardContent,
  AdminCardHeader,
  AdminCardTitle,
  AdminSelectNative,
} from "../../components/admin/adminUi";
import type {
  AdminAnalyticsOverviewDto,
  TestsSummaryDto,
  UserGrowthPointDto,
} from "../../lib/adminAnalyticsApi";
import {
  analyticsPresetToRange,
  fetchAdminOverview,
  fetchTestsSummary,
  fetchUserGrowth,
  formatCompactNumber,
} from "../../lib/adminAnalyticsApi";

type RangeKey = "week" | "month" | "year";

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<RangeKey>("week");
  const [overview, setOverview] = useState<AdminAnalyticsOverviewDto | null>(
    null,
  );
  const [testsSummary, setTestsSummary] = useState<TestsSummaryDto | null>(
    null,
  );
  const [growth, setGrowth] = useState<UserGrowthPointDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { from, to } = analyticsPresetToRange(range);
    void (async () => {
      setError(null);
      try {
        const [ov, ts, ug] = await Promise.all([
          fetchAdminOverview(from, to),
          fetchTestsSummary(from, to),
          fetchUserGrowth(from, to, "day"),
        ]);
        if (!cancelled) {
          setOverview(ov);
          setTestsSummary(ts);
          setGrowth(ug);
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
  }, [range]);

  const signupChartData = useMemo(
    () =>
      growth.map((g) => ({
        tick: new Date(g.periodStart).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        cumulative: g.cumulativeUsers,
        newSignups: g.newUsers,
      })),
    [growth],
  );

  const metrics = useMemo(() => {
    if (!overview || !testsSummary)
      return [] as Array<{
        title: string;
        value: string;
        trend: "up" | "down";
        icon: typeof Users;
      }>;

    const distinct = overview.distinctWatchLearnersInRange;
    const watchMin =
      distinct > 0
        ? (overview.watchHours * 60) / distinct
        : null;

    return [
      {
        title: "Active watchers (distinct)",
        value: `${distinct}`,
        trend: "up" as const,
        icon: Users,
      },
      {
        title: "Avg. watch depth (minutes / watcher)",
        value: watchMin != null ? `${formatCompactNumber(watchMin)} min` : "—",
        trend: "up" as const,
        icon: Clock,
      },
      {
        title: "Survey submit rate",
        value:
          overview.surveySubmissionRatePct != null
            ? `${Math.round(overview.surveySubmissionRatePct * 10) / 10}%`
            : "—",
        trend:
          overview.surveySubmissionRatePct != null &&
          overview.surveySubmissionRatePct >= 55
            ? ("up" as const)
            : ("down" as const),
        icon: Target,
      },
      {
        title: "Avg. test score",
        value:
          testsSummary.avgScorePct != null
            ? `${testsSummary.avgScorePct}%`
            : "—",
        trend: "up" as const,
        icon: BookOpen,
      },
    ];
  }, [overview, testsSummary]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Analytics
          </h1>
          <p className="text-muted-foreground">
            Live aggregates from Postgres + admin API. Range:{" "}
            <span className="capitalize text-primary">{range}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <AdminSelectNative
            className="w-40 bg-card"
            value={range}
            onChange={(e) =>
              setRange(e.target.value as RangeKey)
            }
          >
            <option value="week">Past week</option>
            <option value="month">Past month</option>
            <option value="year">Past year</option>
          </AdminSelectNative>
          <AdminButton variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </AdminButton>
        </div>
      </div>

      {error ? (
        <AdminCard className="border-destructive/40">
          <AdminCardContent className="p-6 text-sm text-destructive">
            {error}
          </AdminCardContent>
        </AdminCard>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((m) => (
          <AdminCard key={m.title}>
            <AdminCardContent className="p-6">
              <div className="flex justify-between gap-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <m.icon className="h-5 w-5 text-primary" />
                </div>
                <span
                  className={`flex items-center gap-1 text-sm font-medium ${m.trend === "up" ? "text-accent" : "text-destructive"}`}
                >
                  {m.trend === "up" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  <span aria-hidden title="Comparison vs prior period — not wired">
                    —
                  </span>
                </span>
              </div>
              <div className="mt-6">
                <p className="text-3xl font-bold">{m.value}</p>
                <p className="text-sm text-muted-foreground">{m.title}</p>
              </div>
            </AdminCardContent>
          </AdminCard>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminCard>
          <AdminCardHeader className="border-border border-b">
            <AdminCardTitle>Signups vs. cumulative learners</AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent className="p-6">
            <div className="h-72">
              {signupChartData.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No signup buckets in range.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={signupChartData}>
                    <CartesianGrid
                      stroke="oklch(0.28 0.04 285)"
                      strokeDasharray="3 6"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="tick"
                      stroke="oklch(0.7 0.02 285)"
                      fontSize={12}
                    />
                    <YAxis stroke="oklch(0.7 0.02 285)" fontSize={12} />
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
                      dataKey="cumulative"
                      name="Cumulative users"
                      stroke="oklch(0.65 0.25 295)"
                      fill="oklch(0.65 0.25 295 / 0.4)"
                    />
                    <Area
                      type="monotone"
                      dataKey="newSignups"
                      name="New signups"
                      stroke="oklch(0.75 0.18 145)"
                      fill="oklch(0.75 0.18 145 / 0.35)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </AdminCardContent>
        </AdminCard>

        <AdminCard>
          <AdminCardHeader className="border-border border-b">
            <AdminCardTitle>Assessment funnel</AdminCardTitle>
          </AdminCardHeader>
          <AdminCardContent className="flex flex-col justify-center gap-5 p-6">
            {!overview || !testsSummary ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <>
                <div className="rounded-xl border border-border bg-muted/20 p-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Comprehension attempts
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold text-foreground">
                    {testsSummary.attempts}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <AdminBadge variant="outline">
                      avg {testsSummary.avgScorePct ?? "—"}%
                    </AdminBadge>
                    <AdminBadge variant="secondary">
                      pass {testsSummary.passRatePct ?? "—"}%
                    </AdminBadge>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-muted/20 p-5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Placement completions
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold text-foreground">
                    {overview.placementCompletionsInRange}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Stored when learners finish{" "}
                    <code className="rounded bg-background px-1 text-xs">
                      /placement-test/complete
                    </code>
                    .
                  </p>
                </div>
              </>
            )}
          </AdminCardContent>
        </AdminCard>
      </div>

      <AdminCard>
        <AdminCardHeader className="border-border border-b">
          <AdminCardTitle>Operational snapshot</AdminCardTitle>
        </AdminCardHeader>
        <AdminCardContent className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-4">
          {overview ? (
            <>
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm">
                <p className="text-muted-foreground">Watch hours</p>
                <p className="font-display text-xl font-semibold">
                  {formatCompactNumber(overview.watchHours)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm">
                <p className="text-muted-foreground">Watch completions</p>
                <p className="font-display text-xl font-semibold">
                  {overview.watchCompletionsInRange}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm">
                <p className="text-muted-foreground">New registrations</p>
                <p className="font-display text-xl font-semibold">
                  {overview.newRegistrationsInRange}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm">
                <p className="text-muted-foreground">Total catalog videos</p>
                <p className="font-display text-xl font-semibold">
                  {overview.totalContentVideos}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}
