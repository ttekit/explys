import { Link, useLocation, useParams } from "react-router";
import { useMemo, useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Tags } from "lucide-react";
import { ChameleonMascot } from "../../components/ChameleonMascot";
import { ProfileCard } from "../../components/profile/ProfileCard";
import { KnowledgeShiftBar } from "../../components/profile/KnowledgeMeters";
import { apiFetch } from "../../lib/api";
import { cn } from "../../lib/utils";
import {
  estimatedLessonKnowledgeFromQuizPct,
  WATCH_COMPLETE_LISTENING_POINTS,
} from "../../lib/lessonKnowledgeEstimate";

export type LessonWordEntry = {
  word: string;
  definition: string;
};

export type LessonSummaryState = {
  correctCount: number;
  totalQuestions: number;
  xpEarned: number;
  videoName: string;
  categoryName: string;
  videoDescription: string | null;
  learnedWords: LessonWordEntry[];
  lessonTopics: { id: number; name: string }[];
  themeTags: string[];
  levelTags: string[];
};

const STORAGE_PREFIX = "lessonSummary:";

function normalizeWords(raw: unknown): LessonWordEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: LessonWordEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const w = row as { word?: unknown; definition?: unknown };
    const word = typeof w.word === "string" ? w.word.trim() : "";
    const definition =
      typeof w.definition === "string" ? w.definition.trim() : "";
    if (word.length < 2 || definition.length < 2) continue;
    out.push({ word, definition });
  }
  return out.slice(0, 12);
}

function normalizeTopics(raw: unknown): { id: number; name: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { id: number; name: string }[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const t = row as { id?: unknown; name?: unknown };
    const id = typeof t.id === "number" ? t.id : Number(t.id);
    const name = typeof t.name === "string" ? t.name.trim() : "";
    if (!Number.isFinite(id) || name.length < 1) continue;
    out.push({ id, name });
  }
  return out;
}

function normalizeStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((s) => s.trim())
    .slice(0, 24);
}

function readStoredSummary(videoId: string): LessonSummaryState | null {
  try {
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${videoId}`);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<LessonSummaryState>;
    if (
      typeof p.correctCount !== "number" ||
      typeof p.totalQuestions !== "number" ||
      typeof p.xpEarned !== "number" ||
      typeof p.videoName !== "string" ||
      typeof p.categoryName !== "string"
    ) {
      return null;
    }
    return {
      correctCount: p.correctCount,
      totalQuestions: p.totalQuestions,
      xpEarned: p.xpEarned,
      videoName: p.videoName,
      categoryName: p.categoryName,
      videoDescription:
        typeof p.videoDescription === "string" || p.videoDescription === null
          ? p.videoDescription
          : null,
      learnedWords: normalizeWords(p.learnedWords),
      lessonTopics: normalizeTopics(p.lessonTopics),
      themeTags: normalizeStringList(p.themeTags),
      levelTags: normalizeStringList(p.levelTags),
    };
  } catch {
    return null;
  }
}

type VideoMeta = {
  videoName: string;
  categoryName: string;
  videoDescription: string | null;
  lessonTopics: { id: number; name: string }[];
  themeTags: string[];
  levelTags: string[];
};

function parseVideoJson(data: unknown): VideoMeta | null {
  if (!data || typeof data !== "object") return null;
  const d = data as {
    videoName?: unknown;
    videoDescription?: unknown;
    content?: unknown;
  };
  const name = typeof d.videoName === "string" ? d.videoName : "Lesson";
  const desc =
    typeof d.videoDescription === "string" || d.videoDescription === null
      ? d.videoDescription
      : null;
  let categoryName = "";
  let lessonTopics: { id: number; name: string }[] = [];
  let themeTags: string[] = [];
  let levelTags: string[] = [];
  if (d.content && typeof d.content === "object") {
    const c = d.content as {
      category?: { name?: unknown };
      stats?: unknown;
    };
    if (typeof c.category?.name === "string") {
      categoryName = c.category.name;
    }
    const st = c.stats;
    if (st && typeof st === "object") {
      const stats = st as {
        topics?: unknown;
        userTags?: unknown;
        systemTags?: unknown;
      };
      lessonTopics = normalizeTopics(stats.topics);
      themeTags = normalizeStringList(stats.userTags);
      levelTags = normalizeStringList(stats.systemTags);
    }
  }
  return {
    videoName: name,
    categoryName,
    videoDescription: desc,
    lessonTopics,
    themeTags,
    levelTags,
  };
}

function coerceSummary(
  s: LessonSummaryState | null | undefined,
): LessonSummaryState | null {
  if (!s) return null;
  if (
    typeof s.correctCount !== "number" ||
    typeof s.totalQuestions !== "number" ||
    typeof s.xpEarned !== "number" ||
    typeof s.videoName !== "string" ||
    typeof s.categoryName !== "string"
  ) {
    return null;
  }
  return {
    ...s,
    videoDescription:
      typeof s.videoDescription === "string" || s.videoDescription === null
        ? s.videoDescription
        : null,
    learnedWords: normalizeWords(s.learnedWords),
    lessonTopics: normalizeTopics(s.lessonTopics),
    themeTags: normalizeStringList(s.themeTags),
    levelTags: normalizeStringList(s.levelTags),
  };
}

export default function LessonSummaryPage() {
  const { id: videoId } = useParams();
  const location = useLocation();
  const fromNav = location.state as LessonSummaryState | null;
  const [stored, setStored] = useState<LessonSummaryState | null>(null);
  const [metaOnly, setMetaOnly] = useState<VideoMeta | null>(null);

  const summary = coerceSummary(fromNav) ?? coerceSummary(stored);

  useEffect(() => {
    if (!videoId || fromNav) return;
    setStored(readStoredSummary(videoId));
  }, [videoId, fromNav]);

  useEffect(() => {
    if (!videoId || summary) return;
    const vid = Number.parseInt(String(videoId), 10);
    if (!Number.isFinite(vid) || vid <= 0) return;
    let cancelled = false;
    void apiFetch(`/content-video/${vid}`, { method: "GET" }).then(async (r) => {
      if (cancelled || !r.ok) return;
      const data = await r.json();
      if (cancelled) return;
      const meta = parseVideoJson(data);
      if (meta) setMetaOnly(meta);
    });
    return () => {
      cancelled = true;
    };
  }, [videoId, summary]);

  const knowledgeEstimate = useMemo(() => {
    if (!summary) return null;
    const pct =
      summary.totalQuestions > 0
        ? Math.round((summary.correctCount / summary.totalQuestions) * 100)
        : 0;
    return {
      pct,
      ...estimatedLessonKnowledgeFromQuizPct(pct),
    };
  }, [summary]);

  const display = useMemo(() => {
    if (summary && knowledgeEstimate) {
      const mood =
        knowledgeEstimate.pct >= 80
          ? "excited"
          : knowledgeEstimate.pct >= 50
            ? "happy"
            : "thinking";
      const message =
        knowledgeEstimate.pct >= 80
          ? "Strong work — you’re ready for the next lesson."
          : knowledgeEstimate.pct >= 50
            ? "Good effort — skim vocabulary once more."
            : "Review the clip and vocabulary, then retry.";
      return {
        kind: "full" as const,
        summary,
        knowledgeEstimate,
        mood,
        message,
      };
    }
    if (metaOnly) {
      return {
        kind: "meta" as const,
        metaOnly,
      };
    }
    return { kind: "empty" as const };
  }, [summary, metaOnly, knowledgeEstimate]);

  if (!videoId) {
    return (
      <div className="min-h-screen bg-background px-4 pt-24 text-center">
        <p className="text-muted-foreground">Missing lesson.</p>
        <Link
          to="/catalog"
          className="mt-4 inline-block text-sm font-medium text-primary"
        >
          Back to catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <header className="border-border border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/catalog"
            className="inline-flex shrink-0 items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Catalog</span>
          </Link>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <ChameleonMascot size="sm" mood="happy" animate={false} />
            <span className="font-display truncate font-bold">Lesson summary</span>
          </div>
          <div className="w-16 shrink-0" aria-hidden />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        {display.kind === "empty" ? (
          <div className="rounded-2xl border border-border bg-card/50 p-8 text-center">
            <p className="text-muted-foreground">
              No results for this lesson. Open the lesson, finish the quiz, and
              tap “Complete lesson” to see your score here.
            </p>
            <Link
              to={`/content/${videoId}`}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Open lesson
            </Link>
          </div>
        ) : display.kind === "meta" ? (
          <div className="rounded-2xl border border-border bg-card/50 p-8 text-center">
            <BookOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h1 className="font-display text-xl font-bold">
              {display.metaOnly.videoName}
            </h1>
            {display.metaOnly.categoryName ? (
              <p className="mt-2 text-sm text-primary">
                {display.metaOnly.categoryName}
              </p>
            ) : null}
            <p className="mt-4 text-sm text-muted-foreground">
              Complete the quiz on the lesson page to see your score, words, and
              topic updates here.
            </p>
            <Link
              to={`/content/${videoId}`}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Continue lesson
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center">
              <ChameleonMascot
                size="lg"
                mood={display.mood}
                className="mx-auto mb-6"
              />
              <span className="inline-block rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                {display.summary.categoryName}
              </span>
              <h1 className="font-display mt-3 text-2xl font-bold sm:text-3xl">
                {display.summary.videoName}
              </h1>
              {display.summary.videoDescription?.trim() ? (
                <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  {display.summary.videoDescription.trim()}
                </p>
              ) : null}
            </div>

            <div
              className={cn(
                "mt-10 rounded-2xl border p-6 sm:p-8",
                "border-accent/25 bg-accent/5",
              )}
            >
              <h2 className="font-display text-center text-lg font-semibold">
                Quiz results
              </h2>
              <div className="mt-6 text-center">
                <p className="font-display text-4xl font-bold text-primary tabular-nums">
                  {display.summary.correctCount}/{display.summary.totalQuestions}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {display.knowledgeEstimate.pct}% correct
                </p>
              </div>
              <p className="mt-6 text-center text-sm leading-relaxed text-muted-foreground">
                {display.message}
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="font-display text-lg font-semibold">
                  Words you explored
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Key vocabulary from this lesson — add them to your active study
                list by revisiting the Vocabulary tab.
              </p>
              {display.summary.learnedWords.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No personalised word list was returned for this run. Try again
                  after the lesson sidebar finishes loading, or open the lesson to
                  see defaults.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {display.summary.learnedWords.map((w) => (
                    <li
                      key={w.word}
                      className="rounded-lg border border-border/80 bg-background/50 px-3 py-2.5"
                    >
                      <span className="font-semibold text-foreground">
                        {w.word}
                      </span>
                      <span className="text-muted-foreground"> — </span>
                      <span className="text-sm text-muted-foreground">
                        {w.definition}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="font-display text-lg font-semibold">
                  Topics and knowledge
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                How this lesson maps to tags and catalogue topics linked to the
                clip.
              </p>

              {display.summary.levelTags.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Level focus
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {display.summary.levelTags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {display.summary.lessonTopics.length > 0 ? (
                <div className="mt-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Linked topics
                  </p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-foreground">
                    {display.summary.lessonTopics.map((t) => (
                      <li key={t.id}>{t.name}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {display.summary.themeTags.length > 0 ? (
                <div className="mt-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Lesson themes
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {display.summary.themeTags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {display.summary.lessonTopics.length === 0 &&
              display.summary.themeTags.length === 0 &&
              display.summary.levelTags.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  This clip isn’t tagged to specific catalogue topics yet. Your
                  score still updates your progress in{" "}
                  <strong>{display.summary.categoryName}</strong>.
                </p>
              ) : null}
            </div>

            <div className="mt-8">
              <ProfileCard title="Estimated knowledge shift from your quiz">
                <div className="rounded-xl border border-border/40 bg-secondary/25 p-4">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    This lesson
                  </p>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        Quiz-adjusted skills
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Same layout as progress — model points on a 0–100
                        scale. Listening includes the small watch-complete
                        boost.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-sm font-semibold tabular-nums text-primary">
                      {display.knowledgeEstimate.pct}%
                    </span>
                  </div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Overall
                  </p>
                  <div className="mb-3 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${display.knowledgeEstimate.pct}%`,
                      }}
                    />
                  </div>
                  <div className="space-y-2.5 pt-1">
                    <KnowledgeShiftBar
                      label="Listening"
                      deltaPoints={
                        display.knowledgeEstimate.listening +
                        WATCH_COMPLETE_LISTENING_POINTS
                      }
                      barClass="bg-sky-500/80 dark:bg-sky-400/90"
                      suffix=""
                    />
                    <KnowledgeShiftBar
                      label="Vocabulary"
                      deltaPoints={display.knowledgeEstimate.vocabulary}
                      barClass="bg-violet-500/80 dark:bg-violet-400/85"
                      suffix=""
                    />
                    <KnowledgeShiftBar
                      label="Grammar"
                      deltaPoints={0}
                      barClass="bg-amber-500/75 dark:bg-amber-400/80"
                      suffix=""
                    />
                  </div>
                </div>
              </ProfileCard>
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-card p-6 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Experience earned
              </p>
              <p className="font-display mt-2 text-3xl font-bold text-foreground tabular-nums">
                +{display.summary.xpEarned} XP
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  to="/catalog"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Next in catalog
                </Link>
                <Link
                  to={`/content/${videoId}`}
                  className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
                >
                  Review lesson
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
