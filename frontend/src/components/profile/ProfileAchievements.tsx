import {
  Award,
  BookOpen,
  Crown,
  Flame,
  Lock,
  Star,
} from "lucide-react";
import type { ComponentType } from "react";
import { ProfileCard } from "./ProfileCard";
import { useUser } from "../../context/UserContext";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import type { LandingMessages } from "../../locales/landing";
import { formatMessage } from "../../lib/formatMessage";

function PlayCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
    </svg>
  );
}

type AchievementId = "first-video" | "streak-7" | "streak-30" | "vocabulary-100" | "vocabulary-500" | "vocabulary-1000";

const BASE_ACHIEVEMENTS: ReadonlyArray<{
  id: AchievementId;
  icon: ComponentType<{ className?: string }>;
  rarity: "common" | "rare" | "legendary";
  requirement: number;
  type: "video" | "streak" | "vocab";
}> = [
  { id: "first-video", icon: PlayCircleIcon, rarity: "common", requirement: 1, type: "video" },
  { id: "streak-7", icon: Flame, rarity: "common", requirement: 7, type: "streak" },
  { id: "streak-30", icon: Crown, rarity: "rare", requirement: 30, type: "streak" },
  { id: "vocabulary-100", icon: BookOpen, rarity: "common", requirement: 100, type: "vocab" },
  { id: "vocabulary-500", icon: Star, rarity: "rare", requirement: 500, type: "vocab" },
  { id: "vocabulary-1000", icon: Award, rarity: "legendary", requirement: 1000, type: "vocab" },
];

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

type AchievementMsgs = LandingMessages["profileAchievements"];

function achievementTable(a: AchievementMsgs): Record<
  AchievementId,
  { title: string; description: string }
> {
  return {
    "first-video": { title: a.firstVideoTitle, description: a.firstVideoDesc },
    "streak-7": { title: a.streak7Title, description: a.streak7Desc },
    "streak-30": { title: a.streak30Title, description: a.streak30Desc },
    "vocabulary-100": { title: a.vocab100Title, description: a.vocab100Desc },
    "vocabulary-500": { title: a.vocab500Title, description: a.vocab500Desc },
    "vocabulary-1000": { title: a.vocab1000Title, description: a.vocab1000Desc },
  };
}

function rarityLabel(rarity: keyof typeof rarityColors, a: AchievementMsgs): string {
  if (rarity === "common") return a.rarityCommon;
  if (rarity === "rare") return a.rarityRare;
  return a.rarityLegendary;
}

/**
 * Achievements tab: progress grid with localized titles and rarity labels.
 */
export function ProfileAchievements() {
  const { user } = useUser();
  const { messages } = useLandingLocale();
  const a = messages.profileAchievements;

  const userAchievements = new Set(
    (user?.achievements || []).map((ach: unknown) =>
      typeof ach === "string" ? ach : (ach as { achievementId?: string })?.achievementId,
    ).filter(Boolean),
  );

  const currentStreak = (user as { currentStreak?: number })?.currentStreak || 0;

  const unlockedCount = BASE_ACHIEVEMENTS.filter((row) => {
    const fromDb = userAchievements.has(row.id);
    let progress = 0;
    if (row.type === "streak") progress = currentStreak;
    return fromDb || progress >= row.requirement;
  }).length;

  const totalCount = BASE_ACHIEVEMENTS.length;
  const localizedAchievements = achievementTable(a);

  return (
    <div className="space-y-6">
      <ProfileCard noPadding contentClassName="p-0">
        <div className="border-b rounded-2xl border-border/40 bg-gradient-to-br from-primary/20 via-card to-accent/20 p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <img src="/Icon.svg" className="w-15 h-19" alt="" />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="mb-2 text-2xl font-bold text-foreground">
                {a.hunterTitle}
              </h2>
              <p className="mb-4 text-muted-foreground">
                {formatMessage(a.unlockedLead, { unlocked: unlockedCount, total: totalCount })}
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{a.progressLabel}</span>
                  <span className="font-medium text-foreground">
                    {Math.round((unlockedCount / totalCount) * 100)}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProfileCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {BASE_ACHIEVEMENTS.map((achievement) => {
          const Icon = achievement.icon;
          const rarity = achievement.rarity;
          const copy = localizedAchievements[achievement.id];

          let currentProgressValue = 0;
          if (achievement.type === "streak") currentProgressValue = currentStreak;

          const isUnlocked = userAchievements.has(achievement.id) || currentProgressValue >= achievement.requirement;

          const displayProgress = Math.min(currentProgressValue, achievement.requirement);
          const progressPercent = Math.round((displayProgress / achievement.requirement) * 100);

          return (
            <div
              key={achievement.id}
              className={`relative overflow-hidden rounded-xl border transition-all ${isUnlocked
                ? rarityColors[rarity]
                : "border-border/30 bg-card/30 opacity-70"
                } `}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-xl p-2.5 ${isUnlocked
                      ? rarity === "legendary" ? "bg-accent/20" : rarity === "rare" ? "bg-primary/20" : "bg-secondary"
                      : "bg-secondary/50"
                      }`}
                  >
                    {isUnlocked ? (
                      <Icon className={`size-6 ${rarity === "legendary" ? "text-accent" : rarity === "rare" ? "text-primary" : "text-foreground"}`} />
                    ) : (
                      <Lock className="size-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold text-foreground">{copy.title}</h3>
                      <span className={`rounded px-1.5 py-0.5 text-xs capitalize ${rarityBadge[rarity]}`}>
                        {rarityLabel(rarity, a)}
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-muted-foreground">{copy.description}</p>

                    {isUnlocked ? (
                      <p className="text-xs text-accent">{a.unlockedExclaim}</p>
                    ) : (
                      <div className="space-y-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${progressPercent}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {displayProgress} / {achievement.requirement}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
