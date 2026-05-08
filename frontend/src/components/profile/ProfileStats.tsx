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
  Award,
  CheckCircle,
  Clock,
  PlayCircle,
  Target,
  TrendingUp,
} from "lucide-react";
import { ProfileCard } from "./ProfileCard";
import { parseCefrLevel, cefrIndex, cefrOrder } from "./cefr";

const skillBreakdown = [
  { skill: "Listening", value: 78 },
  { skill: "Vocabulary", value: 65 },
  { skill: "Grammar", value: 72 },
  { skill: "Speaking", value: 58 },
] as const;

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
    <div className="rounded-xl border border-border/40 bg-card/50 p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${iconWrapClass}`}>
          <Icon className="size-5 text-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

export function ProfileStats({ user }: { user: ProfileStatsModel }) {
  const hours = Math.floor(user.totalWatchTimeMin / 60);
  const minutes = user.totalWatchTimeMin % 60;
  const current = parseCefrLevel(user.levelLabel || "A1");
  const idx = cefrIndex(current);
  const order = cefrOrder();
  const weeklyActivity =
    user.weeklyActivity?.length === 7
      ? user.weeklyActivity
      : DEFAULT_WEEKLY_ACTIVITY;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Totals and the weekly activity chart use your watch sessions and quiz
        attempts. Skill breakdown below is still illustrative.
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          icon={Clock}
          iconWrapClass="bg-primary/20 [&_svg]:text-primary"
          value={
            <>
              {hours}h {minutes}m
            </>
          }
          label="Total watch time"
        />
        <StatTile
          icon={PlayCircle}
          iconWrapClass="bg-accent/20 [&_svg]:text-accent"
          value={user.videosCompleted}
          label="Videos completed"
        />
        <StatTile
          icon={CheckCircle}
          iconWrapClass="bg-muted text-foreground"
          value={user.testsCompleted}
          label="Tests completed"
        />
        <StatTile
          icon={Target}
          iconWrapClass="bg-muted [&_svg]:text-muted-foreground"
          value={
            user.averageScore != null ? `${user.averageScore}%` : "—"
          }
          label="Average quiz score"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileCard title="Weekly activity">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyActivity}>
                <defs>
                  <linearGradient
                    id="profileWeeklyActivityGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="var(--primary)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--primary)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#profileWeeklyActivityGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5 text-primary" />
            Minutes watched this calendar week (Mon–Sun, UTC), from your sessions.
          </p>
        </ProfileCard>

        <ProfileCard title="Skill breakdown">
          <div className="space-y-4">
            {skillBreakdown.map((skill) => (
              <div key={skill.skill} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">
                    {skill.skill}
                  </span>
                  <span className="text-muted-foreground">{skill.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
                    style={{ width: `${skill.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <Award className="size-3.5 text-accent" />
            Illustrative breakdown — skill analytics sync is planned.
          </p>
        </ProfileCard>
      </div>

      <ProfileCard title="Level progression">
        <div className="flex items-end gap-2">
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
                      className="h-full rounded-full bg-accent transition-[width]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      current === lp
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {lp}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          You are working around{" "}
          <span className="font-semibold text-primary">{current}</span> — keep
          leveling up with lessons and reviews.
        </p>
      </ProfileCard>
    </div>
  );
}
