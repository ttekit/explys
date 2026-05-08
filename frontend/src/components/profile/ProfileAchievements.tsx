import {
  Award,
  BookOpen,
  Clock,
  Crown,
  Flame,
  Heart,
  Lock,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { ChameleonMascot } from "../ChameleonMascot";
import { ProfileCard } from "./ProfileCard";

function PlayCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
    </svg>
  );
}

const achievements = [
  {
    id: "first-video",
    title: "First Steps",
    description: "Complete your first video",
    icon: PlayCircleIcon,
    unlocked: true,
    date: "Jan 15, 2024",
    rarity: "common",
  },
  {
    id: "streak-7",
    title: "Week Warrior",
    description: "Maintain a 7-day streak",
    icon: Flame,
    unlocked: true,
    date: "Jan 22, 2024",
    rarity: "common",
  },
  {
    id: "streak-30",
    title: "Monthly Master",
    description: "Maintain a 30-day streak",
    icon: Crown,
    unlocked: false,
    progress: 40,
    rarity: "rare",
  },
  {
    id: "vocabulary-100",
    title: "Word Collector",
    description: "Learn 100 new words",
    icon: BookOpen,
    unlocked: true,
    date: "Feb 5, 2024",
    rarity: "common",
  },
  {
    id: "vocabulary-500",
    title: "Lexicon Lord",
    description: "Learn 500 new words",
    icon: Star,
    unlocked: true,
    date: "Mar 10, 2024",
    rarity: "rare",
  },
  {
    id: "vocabulary-1000",
    title: "Dictionary Deity",
    description: "Learn 1000 new words",
    icon: Award,
    unlocked: false,
    progress: 85,
    rarity: "legendary",
  },
  {
    id: "perfect-score",
    title: "Perfect Score",
    description: "Get 100% on any quiz",
    icon: Target,
    unlocked: true,
    date: "Feb 20, 2024",
    rarity: "rare",
  },
  {
    id: "watch-10-hours",
    title: "Binge Watcher",
    description: "Watch 10 hours of content",
    icon: Clock,
    unlocked: true,
    date: "Feb 28, 2024",
    rarity: "common",
  },
  {
    id: "level-up",
    title: "Level Up",
    description: "Advance to the next level",
    icon: Zap,
    unlocked: true,
    date: "Mar 15, 2024",
    rarity: "rare",
  },
  {
    id: "all-categories",
    title: "Well Rounded",
    description: "Complete videos in all categories",
    icon: Heart,
    unlocked: false,
    progress: 60,
    rarity: "rare",
  },
  {
    id: "speed-learner",
    title: "Speed Learner",
    description: "Complete 5 videos in one day",
    icon: Zap,
    unlocked: false,
    progress: 0,
    rarity: "legendary",
  },
  {
    id: "top-student",
    title: "Top Student",
    description: "Reach the top 10% of learners",
    icon: Trophy,
    unlocked: false,
    progress: 75,
    rarity: "legendary",
  },
] as const;

const rarityColors = {
  common: "border-muted-foreground/30 bg-secondary/50",
  rare: "border-primary/50 bg-primary/10",
  legendary: "border-accent/50 bg-accent/10",
} as const;

const rarityBadge = {
  common: "bg-muted text-muted-foreground",
  rare: "bg-primary/20 text-primary",
  legendary: "bg-accent/20 text-accent",
} as const;

export function ProfileAchievements() {
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <div className="space-y-6">
      <ProfileCard noPadding contentClassName="p-0">
        <div className="border-b border-border/40 bg-gradient-to-br from-primary/20 via-card to-accent/20 p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <ChameleonMascot size="lg" mood="excited" />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="mb-2 text-2xl font-bold text-foreground">
                Achievement Hunter
              </h2>
              <p className="mb-4 text-muted-foreground">
                You&apos;ve unlocked {unlockedCount} out of {totalCount}{" "}
                achievements. Keep learning to unlock more!
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium text-foreground">
                    {Math.round((unlockedCount / totalCount) * 100)}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{
                      width: `${(unlockedCount / totalCount) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProfileCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {achievements.map((achievement) => {
          const Icon = achievement.icon;
          const rarity = achievement.rarity as keyof typeof rarityColors;
          return (
            <div
              key={achievement.id}
              className={`relative overflow-hidden rounded-xl border transition-all ${
                achievement.unlocked
                  ? rarityColors[rarity]
                  : "border-border/30 bg-card/30 opacity-70"
              } `}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-xl p-2.5 ${
                      achievement.unlocked
                        ? achievement.rarity === "legendary"
                          ? "bg-accent/20"
                          : achievement.rarity === "rare"
                            ? "bg-primary/20"
                            : "bg-secondary"
                        : "bg-secondary/50"
                    }`}
                  >
                    {achievement.unlocked ? (
                      <Icon
                        className={`size-6 ${
                          achievement.rarity === "legendary"
                            ? "text-accent"
                            : achievement.rarity === "rare"
                              ? "text-primary"
                              : "text-foreground"
                        }`}
                      />
                    ) : (
                      <Lock className="size-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-foreground">
                        {achievement.title}
                      </h3>
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs capitalize ${rarityBadge[rarity]}`}
                      >
                        {achievement.rarity}
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-muted-foreground">
                      {achievement.description}
                    </p>
                    {achievement.unlocked && "date" in achievement ? (
                      <p className="text-xs text-accent">
                        Unlocked {achievement.date}
                      </p>
                    ) : "progress" in achievement ? (
                      <div className="space-y-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${achievement.progress}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {achievement.progress}% complete
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Preview achievements — real unlocks will reflect your activity in the
        app.
      </p>
    </div>
  );
}
