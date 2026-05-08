import {
  BookOpen,
  CheckCircle,
  Flame,
  PlayCircle,
  Star,
  Trophy,
  TrendingUp,
} from "lucide-react";
import { ProfileCard } from "./ProfileCard";

const activityHistory = [
  {
    id: "1",
    type: "video_completed",
    title: "Completed: The Office — Business Meeting",
    description: "Scored 85% on the quiz",
    timestamp: "2 hours ago",
    icon: CheckCircle,
    color: "text-accent",
  },
  {
    id: "2",
    type: "achievement",
    title: "Achievement Unlocked: Perfect Score",
    description: "Got 100% on TED Talk quiz",
    timestamp: "5 hours ago",
    icon: Trophy,
    color: "text-primary",
  },
  {
    id: "3",
    type: "streak",
    title: "Streak Extended!",
    description: "You are now on a 12-day streak",
    timestamp: "Today",
    icon: Flame,
    color: "text-orange-500",
  },
  {
    id: "4",
    type: "video_started",
    title: "Started: Friends — The One with the Interview",
    description: "Category: Casual Conversation",
    timestamp: "Yesterday",
    icon: PlayCircle,
    color: "text-primary",
  },
  {
    id: "5",
    type: "vocabulary",
    title: "New Words Learned",
    description: "Added 15 words to your vocabulary",
    timestamp: "Yesterday",
    icon: BookOpen,
    color: "text-muted-foreground",
  },
  {
    id: "6",
    type: "video_completed",
    title: "Completed: TED Talk — The Power of Vulnerability",
    description: "Scored 92% on the quiz",
    timestamp: "2 days ago",
    icon: CheckCircle,
    color: "text-accent",
  },
  {
    id: "7",
    type: "level_up",
    title: "Level Up!",
    description: "Advanced from A2 to B1",
    timestamp: "3 days ago",
    icon: TrendingUp,
    color: "text-primary",
  },
] as const;

interface ProfileActivityProps {
  weeklyActivity?: { day: string; minutes: number }[];
}

export function ProfileActivity({ weeklyActivity = [] }: ProfileActivityProps) {
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const activityMap = new Map(
    weeklyActivity.map((item) => [item.day.slice(0, 3), item.minutes > 0])
  );

  const streakCalendar = daysOfWeek.map((day) => ({
    date: day,
    active: activityMap.get(day) || false,
  }));

  const activeDaysCount = streakCalendar.filter((d) => d.active).length;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ProfileCard title="Activity history">
          <div className="max-h-[500px] overflow-y-auto pr-2">
            <div className="relative">
              <div className="absolute bottom-0 left-4 top-0 w-0.5 bg-border" />
              <div className="space-y-6">
                {activityHistory.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <div
                      key={activity.id}
                      className="relative flex gap-4 pl-10"
                    >
                      <div className="absolute left-2 flex size-5 items-center justify-center rounded-full border-2 border-border bg-card">
                        <div
                          className={`size-2 rounded-full ${activity.type === "achievement" ||
                            activity.type === "level_up"
                            ? "bg-primary"
                            : activity.type === "streak"
                              ? "bg-orange-500"
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
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Sample timeline — your real events will show here as we connect
            activity tracking.
          </p>
        </ProfileCard>
      </div>

      <div className="space-y-6">
        <ProfileCard title="Weekly streak">
          <div className="flex justify-between gap-1">
            {streakCalendar.map((day) => (
              <div key={day.date} className="flex flex-col items-center gap-1">
                <div
                  className={`flex size-8 items-center justify-center rounded-lg ${day.active
                    ? "bg-orange-500 text-white"
                    : "bg-secondary text-muted-foreground"
                    }`}
                >
                  {day.active ? <Flame className="size-4" /> : null}
                </div>
                <span className="text-xs text-muted-foreground">{day.date}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {activeDaysCount} out of 7 days this week
          </p>
        </ProfileCard>

        <ProfileCard title="This week">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle className="size-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Videos watched
                </span>
              </div>
              <span className="font-semibold text-foreground">8</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-accent" />
                <span className="text-sm text-muted-foreground">
                  Quizzes passed
                </span>
              </div>
              <span className="font-semibold text-foreground">6</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="size-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Words learned
                </span>
              </div>
              <span className="font-semibold text-foreground">42</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="size-4 text-accent" />
                <span className="text-sm text-muted-foreground">
                  Average score
                </span>
              </div>
              <span className="font-semibold text-foreground">85%</span>
            </div>
          </div>
        </ProfileCard>

        <div className="rounded-xl border border-border/50 bg-gradient-to-br from-primary/20 to-accent/20 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/20 p-2">
              <Trophy className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Best performance</p>
              <p className="font-semibold text-foreground">
                TED Talk: Vulnerability
              </p>
              <span className="mt-1 inline-block rounded-md bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                92% score (sample)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}