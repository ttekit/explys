import type { ComponentType, ReactNode } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CheckCircle,
  Clock,
  PlayCircle,
  Target,
  Crown,
  Zap,
} from "lucide-react";
import { ProfileCard } from "./ProfileCard";
import { parseCefrLevel, cefrIndex, cefrOrder } from "./cefr";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { formatMessage } from "../../lib/formatMessage";

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const DEFAULT_WEEKLY_ACTIVITY: { day: string; minutes: number }[] =
  DAY_ORDER.map((day) => ({ day, minutes: 0 }));

export interface ProfileStatsModel {
  totalWatchTimeMin: number;
  videosCompleted: number;
  testsCompleted: number;
  averageScore: number | null;
  levelLabel: string;
  weeklyActivity: { day: string; minutes: number }[];
  xp?: number;
  appLevel?: number;
}

function StatTile({
  icon: Icon,
  iconWrapClass,
  value,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  iconWrapClass: string;
  value: ReactNode;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-4 shadow-xs">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${iconWrapClass}`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
        </div>
      </div>
    </div>
  );
}

function resolveChartDayAbbrev(
  dayKey: string,
  abbrev: Readonly<Record<string, string>>,
): string {
  const k = dayKey.slice(0, 3);
  const v = abbrev[k];
  return typeof v === "string" ? v : dayKey;
}

/**
 * Overview tab: level, XP, stat tiles, weekly chart, and CEFR band summary.
 */
export function ProfileStats({ user }: { user: ProfileStatsModel | null }) {
  const { messages } = useLandingLocale();
  const s = messages.profileStats;

  if (!user) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground italic">{s.loadingStats}</p>
      </div>
    );
  }

  const hours = Math.floor(user.totalWatchTimeMin / 60);
  const minutes = user.totalWatchTimeMin % 60;
  const current = parseCefrLevel(user.levelLabel || "A1");
  const idx = cefrIndex(current);
  const order = cefrOrder();
  const weeklyActivity =
    user.weeklyActivity?.length === 7
      ? user.weeklyActivity
      : DEFAULT_WEEKLY_ACTIVITY;
  const chartData = weeklyActivity.map((row) => ({
    ...row,
    day: resolveChartDayAbbrev(row.day, s.weekdayAbbrev),
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-primary/10 to-transparent p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-primary/20 p-3">
              <Crown className="size-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase">{s.currentRank}</p>
              <p className="text-4xl font-black text-foreground">
                {formatMessage(s.appLevelDisplay, { n: user.appLevel || 1 })}
              </p>
            </div>
          </div>
          <Crown className="absolute -right-4 -bottom-4 size-24 text-primary/5 -rotate-12" />
        </div>

        <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-orange-500/10 to-transparent p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-orange-500/20 p-3">
              <Zap className="size-8 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground uppercase">{s.totalExperience}</p>
              <p className="text-4xl font-black text-foreground">
                {user.xp || 0}{" "}
                <span className="text-xl font-normal text-muted-foreground">{s.xpUnit}</span>
              </p>
            </div>
          </div>
          <Zap className="absolute -right-4 -bottom-4 size-24 text-orange-500/5 rotate-12" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={Clock}
          iconWrapClass="bg-primary/20 text-primary"
          value={<>{hours}h {minutes}m</>}
          label={s.watchTime}
        />
        <StatTile
          icon={PlayCircle}
          iconWrapClass="bg-accent/20 text-accent"
          value={user.videosCompleted}
          label={s.videosDone}
        />
        <StatTile
          icon={CheckCircle}
          iconWrapClass="bg-secondary text-muted-foreground"
          value={user.testsCompleted}
          label={s.quizzes}
        />
        <StatTile
          icon={Target}
          iconWrapClass="bg-secondary text-muted-foreground"
          value={user.averageScore != null ? `${user.averageScore}%` : "—"}
          label={s.avgScore}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileCard title={s.weeklyCardTitle}>
          <div className="h-[200px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorMinutes)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ProfileCard>

        <ProfileCard title={s.proficiencyCardTitle}>
          <div className="flex items-end gap-2 mt-6">
            {order.map((lp) => {
              const levelIndex = order.indexOf(lp);
              let pct = 0;
              if (levelIndex < idx) pct = 100;
              else if (levelIndex === idx) pct = 45;
              return (
                <div key={lp} className="flex-1">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${current === lp ? "bg-accent" : "bg-primary/60"
                          }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs font-bold ${current === lp ? "text-primary" : "text-muted-foreground"
                        }`}
                    >
                      {lp}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {s.estimatedLevel}{" "}
            <span className="font-bold text-primary">{current}</span>
          </p>
        </ProfileCard>
      </div>
    </div>
  );
}
