import {
  Award,
  BookOpen,
  Crown,
  Flame,
  Lock,
  Star,
} from "lucide-react";
import { ProfileCard } from "./ProfileCard";
import { useUser } from "../../context/UserContext";

function PlayCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
    </svg>
  );
}

// Мы убрали 'unlocked' и 'progress' из массива. Это будет считаться кодом!
const BASE_ACHIEVEMENTS = [
  { id: "first-video", title: "First Steps", description: "Complete your first video", icon: PlayCircleIcon, rarity: "common", requirement: 1, type: "video" },
  { id: "streak-7", title: "Week Warrior", description: "Maintain a 7-day streak", icon: Flame, rarity: "common", requirement: 7, type: "streak" },
  { id: "streak-30", title: "Monthly Master", description: "Maintain a 30-day streak", icon: Crown, rarity: "rare", requirement: 30, type: "streak" },
  { id: "vocabulary-100", title: "Word Collector", description: "Learn 100 new words", icon: BookOpen, rarity: "common", requirement: 100, type: "vocab" },
  { id: "vocabulary-500", title: "Lexicon Lord", description: "Learn 500 new words", icon: Star, rarity: "rare", requirement: 500, type: "vocab" },
  { id: "vocabulary-1000", title: "Dictionary Deity", description: "Learn 1000 new words", icon: Award, rarity: "legendary", requirement: 1000, type: "vocab" },
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
  const { user } = useUser();

  // БЕЗПЕЧНИЙ ПАРСИНГ: якщо бекенд надіслав об'єкти замість рядків, ми це виправимо на льоту
  const userAchievements = new Set(
    (user?.achievements || []).map((a: any) =>
      typeof a === "string" ? a : a?.achievementId
    ).filter(Boolean)
  );

  const currentStreak = (user as any)?.currentStreak || 0;

  // Рахуємо відкриті ачівки (якщо є в базі АБО якщо прогрес >= вимоги)
  const unlockedCount = BASE_ACHIEVEMENTS.filter((a) => {
    const fromDb = userAchievements.has(a.id);
    let progress = 0;
    if (a.type === "streak") progress = currentStreak;
    return fromDb || progress >= a.requirement;
  }).length;

  const totalCount = BASE_ACHIEVEMENTS.length;

  return (
    <div className="space-y-6">
      <ProfileCard noPadding contentClassName="p-0">
        <div className="border-b rounded-2xl border-border/40 bg-gradient-to-br from-primary/20 via-card to-accent/20 p-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <img src="/Icon.svg" className="w-15 h-19" />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="mb-2 text-2xl font-bold text-foreground">
                Achievement Hunter
              </h2>
              <p className="mb-4 text-muted-foreground">
                You've unlocked {unlockedCount} out of {totalCount} achievements.
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
          const rarity = achievement.rarity as keyof typeof rarityColors;

          let currentProgressValue = 0;
          if (achievement.type === "streak") currentProgressValue = currentStreak;

          // РОЗУМНА ПЕРЕВІРКА: відкриваємо, якщо є в базі або якщо виконали умову
          const isUnlocked = userAchievements.has(achievement.id) || currentProgressValue >= achievement.requirement;

          // ОБМЕЖУВАЧ: щоб не було 8/7, беремо максимум вимогу (7/7)
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
                      <h3 className="truncate font-semibold text-foreground">{achievement.title}</h3>
                      <span className={`rounded px-1.5 py-0.5 text-xs capitalize ${rarityBadge[rarity]}`}>
                        {achievement.rarity}
                      </span>
                    </div>
                    <p className="mb-2 text-sm text-muted-foreground">{achievement.description}</p>

                    {isUnlocked ? (
                      <p className="text-xs text-accent">Unlocked!</p>
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