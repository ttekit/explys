import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  CheckCircle,
  ChevronRight,
  Lock,
  PlayCircle,
} from "lucide-react";
import { ProfileCard } from "./ProfileCard";
import { cn } from "../../lib/utils";
import { apiFetch } from "../../lib/api";
import { useUser } from "../../context/UserContext";
import { pct01, SkillBar } from "./KnowledgeMeters";

type KnowledgeTagRow = {
  name: string;
  score: number;
  listening: number;
  vocabulary: number;
  grammar: number;
  topicCount: number;
};

const learningPaths = [
  {
    id: "business",
    title: "Business English",
    description: "Professional communication for the workplace",
    progress: 65,
    totalVideos: 24,
    completedVideos: 16,
    level: "B2",
    accentClass: "bg-primary",
  },
  {
    id: "travel",
    title: "Travel & Conversation",
    description: "Essential phrases for traveling abroad",
    progress: 40,
    totalVideos: 18,
    completedVideos: 7,
    level: "B1",
    accentClass: "bg-accent",
  },
  {
    id: "academic",
    title: "Academic English",
    description: "Writing and presentation skills",
    progress: 20,
    totalVideos: 30,
    completedVideos: 6,
    level: "C1",
    accentClass: "bg-primary/70",
  },
] as const;

const recentVideos = [
  {
    id: "1",
    title: "The Office — Business Meeting",
    category: "Business",
    completed: true,
    score: 85,
  },
  {
    id: "2",
    title: "TED Talk: The Power of Vulnerability",
    category: "Motivation",
    completed: true,
    score: 92,
  },
  {
    id: "3",
    title: "Friends — The One with the Interview",
    category: "Casual",
    completed: false,
    progress: 80,
  },
  {
    id: "4",
    title: "Breaking Bad — Chemistry Lesson",
    category: "Drama",
    completed: false,
    progress: 0,
  },
] as const;

const vocabularyProgress = {
  total: 1250,
  learned: 847,
  mastered: 523,
  reviewing: 324,
};

export function ProfileProgress() {
  const { user } = useUser();
  const [tagRows, setTagRows] = useState<KnowledgeTagRow[] | null>(null);
  const [tagsError, setTagsError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setTagsError(null);
      const r = await apiFetch("/auth/profile/knowledge-tags", {
        method: "GET",
      });
      if (!r.ok) {
        if (!cancelled) {
          setTagRows([]);
          setTagsError("Could not load tag knowledge.");
        }
        return;
      }
      const raw: unknown = await r.json();
      if (cancelled || !raw || typeof raw !== "object") {
        return;
      }
      const tags = (raw as { tags?: unknown }).tags;
      if (!Array.isArray(tags)) {
        setTagRows([]);
        return;
      }
      const parsed: KnowledgeTagRow[] = [];
      for (const row of tags) {
        if (!row || typeof row !== "object") {
          continue;
        }
        const o = row as Record<string, unknown>;
        const name = typeof o.name === "string" ? o.name.trim() : "";
        if (!name) {
          continue;
        }
        parsed.push({
          name,
          score: Number(o.score) || 0,
          listening: Number(o.listening) || 0,
          vocabulary: Number(o.vocabulary) || 0,
          grammar: Number(o.grammar) || 0,
          topicCount: Number(o.topicCount) || 0,
        });
      }
      setTagRows(parsed);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Learning paths below are a preview. Tag knowledge reflects your model
        scores from topics linked to your profile and activity.
      </p>

      <ProfileCard title="Knowledge by tag">
        {tagRows === null ? (
          <p className="text-sm text-muted-foreground">Loading tags…</p>
        ) : tagsError ? (
          <p className="text-sm text-destructive">{tagsError}</p>
        ) : tagRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tag scores yet. Finish registration details, complete the entry
            test if prompted, and watch videos with quizzes so your strengths
            can be estimated. Then check the{" "}
            <Link to="/catalog" className="text-primary underline-offset-4 hover:underline">
              catalog
            </Link>
            .
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {tagRows.map((row) => (
              <li
                key={row.name}
                className="rounded-xl border border-border/40 bg-secondary/25 p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Averaged over {row.topicCount}{" "}
                      {row.topicCount === 1 ? "topic" : "topics"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-sm font-semibold tabular-nums text-primary">
                    {pct01(row.score)}%
                  </span>
                </div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Overall
                </p>
                <div className="mb-3 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${pct01(row.score)}%` }}
                  />
                </div>
                <div className="space-y-2.5 pt-1">
                  <SkillBar
                    label="Listening"
                    value={row.listening}
                    barClass="bg-sky-500/80 dark:bg-sky-400/90"
                  />
                  <SkillBar
                    label="Vocabulary"
                    value={row.vocabulary}
                    barClass="bg-violet-500/80 dark:bg-violet-400/85"
                  />
                  <SkillBar
                    label="Grammar"
                    value={row.grammar}
                    barClass="bg-amber-500/75 dark:bg-amber-400/80"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </ProfileCard>

      <ProfileCard title="Learning paths">
        <div className="space-y-4">
          {learningPaths.map((path) => (
            <div
              key={path.id}
              className="rounded-xl bg-secondary/30 p-4 transition-colors hover:bg-secondary/50"
            >
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-foreground">
                      {path.title}
                    </h3>
                    <span className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {path.level}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {path.description}
                  </p>
                </div>
                <Link
                  to={`/catalog?path=${path.id}`}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-background/50 hover:text-foreground"
                  aria-label={`Open ${path.title} in catalog`}
                >
                  <ChevronRight className="size-5" />
                </Link>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {path.completedVideos} / {path.totalVideos} videos
                  </span>
                  <span className="font-medium text-foreground">
                    {path.progress}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn("h-full rounded-full", path.accentClass)}
                    style={{ width: `${path.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </ProfileCard>

      <ProfileCard
        title="Recent videos"
        action={
          <Link
            to="/catalog"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        }
      >
        <div className="space-y-3">
          {recentVideos.map((video) => (
            <div
              key={video.id}
              className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-secondary/30"
            >
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  video.completed
                    ? "bg-accent/20"
                    : video.progress > 0
                      ? "bg-primary/20"
                      : "bg-secondary",
                )}
              >
                {video.completed ? (
                  <CheckCircle className="size-5 text-accent" />
                ) : video.progress > 0 ? (
                  <PlayCircle className="size-5 text-primary" />
                ) : (
                  <Lock className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">
                  {video.title}
                </p>
                <p className="text-sm text-muted-foreground">{video.category}</p>
              </div>
              <div className="shrink-0 text-right">
                {video.completed ? (
                  <span className="rounded-md bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                    Score: {video.score}%
                  </span>
                ) : video.progress > 0 ? (
                  <span className="text-sm text-muted-foreground">
                    {video.progress}%
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Not started
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </ProfileCard>

      <ProfileCard title="Vocabulary progress">
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-xl bg-secondary/30 p-4 text-center">
            <p className="text-3xl font-bold text-foreground">
              {vocabularyProgress.total}
            </p>
            <p className="text-sm text-muted-foreground">Total words</p>
          </div>
          <div className="rounded-xl bg-primary/10 p-4 text-center">
            <p className="text-3xl font-bold text-primary">
              {vocabularyProgress.learned}
            </p>
            <p className="text-sm text-muted-foreground">Learned</p>
          </div>
          <div className="rounded-xl bg-accent/10 p-4 text-center">
            <p className="text-3xl font-bold text-accent">
              {vocabularyProgress.mastered}
            </p>
            <p className="text-sm text-muted-foreground">Mastered</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-4 text-center">
            <p className="text-3xl font-bold text-foreground">
              {vocabularyProgress.reviewing}
            </p>
            <p className="text-sm text-muted-foreground">Reviewing</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Overall progress</span>
            <span className="font-medium text-foreground">
              {Math.round(
                (vocabularyProgress.learned / vocabularyProgress.total) * 100,
              )}
              %
            </span>
          </div>
          <div className="flex h-4 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-accent"
              style={{
                width: `${(vocabularyProgress.mastered / vocabularyProgress.total) * 100}%`,
              }}
            />
            <div
              className="h-full bg-primary"
              style={{
                width: `${((vocabularyProgress.learned - vocabularyProgress.mastered) / vocabularyProgress.total) * 100}%`,
              }}
            />
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-accent" /> Mastered
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-primary" /> Learning
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-secondary" /> Remaining
            </span>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Sample data — vocabulary stats will connect to your saved words.
        </p>
      </ProfileCard>
    </div>
  );
}
