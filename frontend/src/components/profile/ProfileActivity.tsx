import { useMemo } from "react";
import type { ComponentType } from "react";
import {
  BookOpen,
  CheckCircle,
  Flame,
  PlayCircle,
  Star,
  Trophy,
  CalendarRange,
} from "lucide-react";
import { Link } from "react-router";
import { ProfileCard } from "./ProfileCard";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { formatMessage } from "../../lib/formatMessage";
import type { LandingMessages } from "../../locales/landing";

const DB_DAY_KEYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type ActivityHistoryItem = {
  kind:
    | "video_completed"
    | "video_watched"
    | "quiz"
    | "achievement"
    | "vocabulary";
  at: string;
  videoTitle?: string;
  scorePct?: number;
  passed?: boolean;
  achievementId?: string;
  term?: string;
  secondsWatched?: number;
};

interface ProfileActivityProps {
  weeklyActivity?: { day: string; minutes: number }[];
  activityHistory?: ActivityHistoryItem[];
  thisWeekVideosWatched?: number;
  thisWeekQuizzesPassed?: number;
  thisWeekWordsLearned?: number;
  thisWeekAverageScore?: number | null;
  bestQuiz?: { title: string; scorePct: number } | null;
  weeklyReview?: {
    weekStart: string;
    lessonCount: number;
    lessonTitles: string[];
    eligible: boolean;
    completedThisWeek: boolean;
    lastScorePct: number | null;
  } | null;
}

type AchievementId =
  | "first-video"
  | "streak-7"
  | "streak-30"
  | "vocabulary-100"
  | "vocabulary-500"
  | "vocabulary-1000";

function achievementTitleForId(
  id: string | undefined,
  ach: LandingMessages["profileAchievements"],
): string {
  if (!id?.trim()) {
    return "";
  }
  const table: Record<AchievementId, string> = {
    "first-video": ach.firstVideoTitle,
    "streak-7": ach.streak7Title,
    "streak-30": ach.streak30Title,
    "vocabulary-100": ach.vocab100Title,
    "vocabulary-500": ach.vocab500Title,
    "vocabulary-1000": ach.vocab1000Title,
  };
  return table[id as AchievementId] ?? id;
}

/**
 * Formats a past/future instant for the activity list using the user locale.
 */
function formatRelativeTimeString(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const cutoffs = [60, 3600, 86400, 86400 * 7, 86400 * 30, 86400 * 365];
  const units: Intl.RelativeTimeFormatUnit[] = [
    "second",
    "minute",
    "hour",
    "day",
    "week",
    "month",
    "year",
  ];
  let i = 0;
  for (; i < cutoffs.length; i++) {
    if (Math.abs(deltaSeconds) < cutoffs[i]) {
      break;
    }
  }
  const divisor = i === 0 ? 1 : cutoffs[i - 1];
  const unit = units[i] ?? "year";
  return rtf.format(Math.round(deltaSeconds / divisor), unit);
}

type ActivityRow = {
  id: string;
  type: ActivityHistoryItem["kind"];
  title: string;
  description: string;
  timestamp: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
};

/**
 * Activity tab: timeline from the API, weekly streak from watch minutes, and this-week stats.
 */
export function ProfileActivity({
  weeklyActivity = [],
  activityHistory = [],
  thisWeekVideosWatched = 0,
  thisWeekQuizzesPassed = 0,
  thisWeekWordsLearned = 0,
  thisWeekAverageScore = null,
  bestQuiz = null,
  weeklyReview = null,
}: ProfileActivityProps) {
  const { messages, locale } = useLandingLocale();
  const a = messages.profileActivity;
  const achMsgs = messages.profileAchievements;
  const dayAbbrev = a.weekdayAbbrev;
  const relLocale = locale === "uk" ? "uk-UA" : "en-US";

  const activityRows: ActivityRow[] = useMemo(() => {
    return activityHistory.map((item, index) => {
      const ts = formatRelativeTimeString(item.at, relLocale);
      if (item.kind === "video_completed") {
        return {
          id: `vc-${item.at}-${index}`,
          type: item.kind,
          title: a.lessonCompletedTitle,
          description: formatMessage(a.lessonNameLine, {
            videoTitle: item.videoTitle?.trim() || "—",
          }),
          timestamp: ts,
          icon: CheckCircle,
          color: "text-accent",
        };
      }
      if (item.kind === "video_watched") {
        const minutes = Math.max(
          1,
          Math.round(Number(item.secondsWatched ?? 0) / 60),
        );
        return {
          id: `vw-${item.at}-${index}`,
          type: item.kind,
          title: a.lessonWatchingTitle,
          description: formatMessage(a.lessonWatchingMinutes, {
            videoTitle: item.videoTitle?.trim() || "—",
            minutes: String(minutes),
          }),
          timestamp: ts,
          icon: PlayCircle,
          color: "text-primary",
        };
      }
      if (item.kind === "quiz") {
        const passed = item.passed === true;
        const score =
          item.scorePct != null && Number.isFinite(item.scorePct)
            ? String(item.scorePct)
            : "—";
        return {
          id: `q-${item.at}-${index}`,
          type: item.kind,
          title: a.quizActivityTitle,
          description: formatMessage(
            passed
              ? a.quizActivitySubtitlePassed
              : a.quizActivitySubtitleFailed,
            {
              videoTitle: item.videoTitle?.trim() || "—",
              score,
            },
          ),
          timestamp: ts,
          icon: Star,
          color: passed ? "text-accent" : "text-muted-foreground",
        };
      }
      if (item.kind === "achievement") {
        const name = achievementTitleForId(item.achievementId, achMsgs);
        return {
          id: `ac-${item.at}-${index}`,
          type: item.kind,
          title: a.achievementActivityTitle,
          description: name || item.achievementId || "—",
          timestamp: ts,
          icon: Trophy,
          color: "text-primary",
        };
      }
      return {
        id: `vo-${item.at}-${index}`,
        type: "vocabulary",
        title: a.vocabActivityTitle,
        description: item.term?.trim() || "—",
        timestamp: ts,
        icon: BookOpen,
        color: "text-muted-foreground",
      };
    });
  }, [activityHistory, a, achMsgs, relLocale]);

  const activityMap = new Map<string, boolean>(
    weeklyActivity.map((item) => [item.day.slice(0, 3), item.minutes > 0]),
  );

  const streakCalendar = DB_DAY_KEYS.map((dbKey) => ({
    dbKey,
    label: dayAbbrev[dbKey],
    active: activityMap.get(dbKey) || false,
  }));

  const activeDaysCount = streakCalendar.filter((d) => d.active).length;

  const avgThisWeek =
    thisWeekAverageScore != null && Number.isFinite(thisWeekAverageScore)
      ? `${thisWeekAverageScore}%`
      : "—";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ProfileCard title={a.historyTitle}>
          <div className="max-h-[500px] overflow-y-auto pr-2">
            {activityRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {a.historyEmpty}
              </p>
            ) : (
              <div className="relative">
                <div className="absolute bottom-0 left-4 top-0 w-0.5 bg-border" />
                <div className="space-y-6">
                  {activityRows.map((activity) => {
                    const Icon = activity.icon;
                    return (
                      <div
                        key={activity.id}
                        className="relative flex gap-4 pl-10"
                      >
                        <div className="absolute left-2 flex size-5 items-center justify-center rounded-full border-2 border-border bg-card">
                          <div
                            className={`size-2 rounded-full ${
                              activity.type === "achievement"
                                ? "bg-primary"
                                : activity.type === "quiz"
                                  ? "bg-accent"
                                  : activity.type === "vocabulary"
                                    ? "bg-muted-foreground"
                                    : "bg-accent"
                            }`}
                          />
                        </div>
                        <div className="flex-1 rounded-xl bg-secondary/30 p-4 transition-colors hover:bg-secondary/50">
                          <div className="flex items-start gap-3">
                            <div className="rounded-lg bg-background/50 p-2">
                              <Icon className={`size-4 ${activity.color}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground">
                                {activity.title}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {activity.description}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {activity.timestamp}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {activityRows.length === 0 ? "" : a.historyFooter}
          </p>
        </ProfileCard>
      </div>

      <div className="space-y-6">
        <ProfileCard title={a.streakTitle}>
          <div className="flex justify-between gap-1">
            {streakCalendar.map(({ dbKey, label, active }) => (
              <div key={dbKey} className="flex flex-col items-center gap-1">
                <div
                  className={`flex size-8 items-center justify-center rounded-lg ${
                    active
                      ? "bg-orange-500 text-white"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {active ? <Flame className="size-4" /> : null}
                </div>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {formatMessage(a.weekActiveSummary, {
              count: activeDaysCount,
              total: 7,
            })}
          </p>
        </ProfileCard>

        <ProfileCard title={a.thisWeekCardTitle}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle className="size-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {a.videosWatchedLabel}
                </span>
              </div>
              <span className="font-semibold text-foreground">
                {thisWeekVideosWatched}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-accent" />
                <span className="text-sm text-muted-foreground">
                  {a.quizzesPassedLabel}
                </span>
              </div>
              <span className="font-semibold text-foreground">
                {thisWeekQuizzesPassed}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {a.wordsLearnedLabel}
                </span>
              </div>
              <span className="font-semibold text-foreground">
                {thisWeekWordsLearned}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="size-4 text-accent" />
                <span className="text-sm text-muted-foreground">
                  {a.averageScoreShort}
                </span>
              </div>
              <span className="font-semibold text-foreground">
                {avgThisWeek}
              </span>
            </div>
          </div>
        </ProfileCard>

        <ProfileCard title={a.weeklyReviewTitle}>
          <p className="text-sm text-muted-foreground">{a.weeklyReviewSubtitle}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {formatMessage(a.weeklyReviewLessonsHint, {
              count: String(weeklyReview?.lessonCount ?? 0),
            })}
          </p>
          {weeklyReview?.completedThisWeek ?
            <p className="mt-4 text-sm font-medium text-foreground">
              {formatMessage(a.weeklyReviewCompleted, {
                score: String(
                  weeklyReview.lastScorePct != null &&
                    Number.isFinite(weeklyReview.lastScorePct)
                    ? weeklyReview.lastScorePct
                    : "—",
                ),
              })}
            </p>
          : weeklyReview?.eligible ?
            <Link
              to="/profile/weekly-review"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <CalendarRange className="mr-2 size-4" aria-hidden />
              {a.weeklyReviewCta}
            </Link>
          : <p className="mt-4 text-sm text-muted-foreground">
              {a.weeklyReviewNeedWatch}
            </p>
          }
        </ProfileCard>

        <div className="rounded-xl border border-border/50 bg-gradient-to-br from-primary/20 to-accent/20 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/20 p-2">
              <Trophy className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {a.bestPerformanceLabel}
              </p>
              {bestQuiz ? (
                <>
                  <p className="font-semibold text-foreground">
                    {bestQuiz.title.trim()
                      ? bestQuiz.title
                      : a.bestQuizLessonFallback}
                  </p>
                  <span className="mt-1 inline-block rounded-md bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                    {formatMessage(a.bestScoreBadge, {
                      score: String(bestQuiz.scorePct),
                    })}
                  </span>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {a.bestPerformanceEmpty}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
