import { Link, useLocation, useParams } from "react-router";
import { useMemo, useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Tags } from "lucide-react";
import { ProfileCard } from "../../components/profile/ProfileCard";
import { KnowledgeShiftBar } from "../../components/profile/KnowledgeMeters";
import { apiFetch } from "../../lib/api";
import { formatMessage } from "../../lib/formatMessage";
import { cn } from "../../lib/utils";
import {
  estimatedLessonKnowledgeFromQuizPct,
  WATCH_COMPLETE_LISTENING_POINTS,
} from "../../lib/lessonKnowledgeEstimate";
import type { QuizWrongReviewItem } from "../../components/content-watch/VideoQuiz";
import { SEO } from "../../components/SEO/SEO";
import { resolveCanonicalUrl } from "../../lib/siteUrl";
import { useAppMessages } from "../../hooks/useAppMessages";

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
  /** Wrong answers with explanations when returned from the lesson quiz. */
  quizReview?: { wrong: QuizWrongReviewItem[] };
  /** Learner’s open-ended summary text, when the quiz included that item. */
  writtenSummaryText?: string;
  /** Personalized coach feedback on the written summary after submit. */
  writtenSummaryFeedback?: string | null;
  /** 1–10 from the server when the written summary was model-graded. */
  writtenSummaryScore?: number | null;
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

function normalizeQuizReview(raw: unknown): LessonSummaryState["quizReview"] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const o = raw as { wrong?: unknown };
  if (!Array.isArray(o.wrong)) return undefined;
  const wrong: QuizWrongReviewItem[] = [];
  for (const row of o.wrong) {
    if (!row || typeof row !== "object") continue;
    const w = row as {
      question?: unknown;
      options?: unknown;
      selectedIndex?: unknown;
      correctIndex?: unknown;
      explanation?: unknown;
      category?: unknown;
    };
    const question = typeof w.question === "string" ? w.question : "";
    const options = Array.isArray(w.options)
      ? w.options.filter((x): x is string => typeof x === "string")
      : [];
    const si =
      typeof w.selectedIndex === "number" ? w.selectedIndex : Number.NaN;
    const ci = typeof w.correctIndex === "number" ? w.correctIndex : Number.NaN;
    if (
      !question.trim() ||
      options.length < 2 ||
      !Number.isFinite(si) ||
      !Number.isFinite(ci)
    ) {
      continue;
    }
    const explanation =
      typeof w.explanation === "string" ? w.explanation.trim() : undefined;
    const cat = w.category;
    const category =
      cat === "grammar" || cat === "comprehension" || cat === "vocabulary"
        ? cat
        : undefined;
    wrong.push({
      question,
      options,
      selectedIndex: si,
      correctIndex: ci,
      explanation:
        explanation && explanation.length > 0 ? explanation : undefined,
      category,
    });
  }
  return wrong.length > 0 ? { wrong } : undefined;
}

function normalizeWrittenSummaryScore(raw: unknown): number | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const r = Math.round(raw);
    if (r >= 1 && r <= 10) return r;
  }
  return undefined;
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
      quizReview: normalizeQuizReview(p.quizReview),
      writtenSummaryText:
        typeof p.writtenSummaryText === "string" && p.writtenSummaryText.trim()
          ? p.writtenSummaryText.trim()
          : undefined,
      writtenSummaryFeedback:
        typeof p.writtenSummaryFeedback === "string" &&
          p.writtenSummaryFeedback.trim()
          ? p.writtenSummaryFeedback.trim()
          : p.writtenSummaryFeedback === null
            ? null
            : undefined,
      writtenSummaryScore: normalizeWrittenSummaryScore(p.writtenSummaryScore),
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
  const name = typeof d.videoName === "string" ? d.videoName : "";
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
    quizReview: normalizeQuizReview(s.quizReview),
    writtenSummaryText:
      typeof s.writtenSummaryText === "string" && s.writtenSummaryText.trim()
        ? s.writtenSummaryText.trim()
        : undefined,
    writtenSummaryFeedback:
      typeof s.writtenSummaryFeedback === "string" &&
        s.writtenSummaryFeedback.trim()
        ? s.writtenSummaryFeedback.trim()
        : s.writtenSummaryFeedback === null
          ? null
          : undefined,
    writtenSummaryScore: normalizeWrittenSummaryScore(s.writtenSummaryScore),
  };
}

export default function LessonSummaryPage() {
  const { id: videoId } = useParams();
  const location = useLocation();
  const fromNav = location.state as LessonSummaryState | null;
  const [stored, setStored] = useState<LessonSummaryState | null>(() =>
    videoId && !fromNav ? readStoredSummary(videoId) : null,
  );
  const [metaOnly, setMetaOnly] = useState<VideoMeta | null>(null);
  const messages = useAppMessages();
  const lesson = messages.lesson;
  const page = messages.lessonSummaryPage;
  const progress = messages.profileProgress;
  const stats = messages.profileStats;

  const storageKey = `${videoId ?? ""}:${Boolean(fromNav)}`;
  const [prevStorageKey, setPrevStorageKey] = useState(storageKey);
  if (storageKey !== prevStorageKey) {
    setPrevStorageKey(storageKey);
    if (videoId && !fromNav) {
      setStored(readStoredSummary(videoId));
    } else {
      setStored(null);
    }
  }

  const summary = coerceSummary(fromNav) ?? coerceSummary(stored);
  const summaryTitle =
    summary?.videoName?.trim() ||
    metaOnly?.videoName?.trim() ||
    lesson.seoLoadingTitle;
  const summaryDescription =
    summary?.videoDescription?.trim() ||
    metaOnly?.videoDescription?.trim() ||
    lesson.seoLoadingDescription;

  useEffect(() => {
    if (!videoId || summary) return;
    const vid = Number.parseInt(String(videoId), 10);
    if (!Number.isFinite(vid) || vid <= 0) return;
    let cancelled = false;
    void apiFetch(`/content-video/${vid}`, { method: "GET" }).then(
      async (r) => {
        if (cancelled || !r.ok) return;
        const data = await r.json();
        if (cancelled) return;
        const meta = parseVideoJson(data);
        if (meta) setMetaOnly(meta);
      },
    );
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
          ? ("excited" as const)
          : knowledgeEstimate.pct >= 50
            ? ("happy" as const)
            : ("thinking" as const);
      const message =
        knowledgeEstimate.pct >= 80
          ? page.moodStrong
          : knowledgeEstimate.pct >= 50
            ? page.moodGood
            : page.moodReview;
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
  }, [summary, metaOnly, knowledgeEstimate, page]);

  if (!videoId) {
    return (
      <div className="min-h-screen bg-background px-4 pt-24 text-center">
        <p className="text-muted-foreground">{page.missingLesson}</p>
        <Link
          to="/catalog"
          className="mt-4 inline-block text-sm font-medium text-primary"
        >
          {lesson.backToCatalog}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <SEO
        title={summaryTitle}
        description={summaryDescription}
        canonicalUrl={resolveCanonicalUrl(
          videoId ? `/content/${videoId}/summary` : "/catalog",
        )}
        noindex
      />
      <header className="border-border border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/catalog"
            className="inline-flex shrink-0 items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm hidden md:block">{lesson.backToCatalog}</span>
          </Link>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <img src={`${import.meta.env.BASE_URL}Icon.svg`} className="w-10 h-13 sm:w-15 sm:h-18" />
            <span className="font-display truncate font-bold">
              {page.pageTitle}
            </span>
          </div>
          <div className="w-16 shrink-0" aria-hidden />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        {display.kind === "empty" ? (
          <div className="rounded-2xl border border-border bg-card/50 p-8 text-center">
            <p className="text-muted-foreground">{page.emptyLead}</p>
            <Link
              to={`/content/${videoId}`}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              {page.openLesson}
            </Link>
          </div>
        ) : display.kind === "meta" ? (
          <div className="rounded-2xl border border-border bg-card/50 p-8 text-center">
            <BookOpen className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h1 className="font-display text-xl font-bold">
              {display.metaOnly.videoName || page.fallbackLessonTitle}
            </h1>
            {display.metaOnly.categoryName ? (
              <p className="mt-2 text-sm text-primary">
                {display.metaOnly.categoryName}
              </p>
            ) : null}
            <p className="mt-4 text-sm text-muted-foreground">{page.metaLead}</p>
            <Link
              to={`/content/${videoId}`}
              className=" flex rounded-[15px] bg-primary px-6 py-3 mt-2 text-sm font-semibold items-center justify-center text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]"
            >
              {page.continueLesson}
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center items-center justify-center flex flex-col">
              <img
                src="/ResultHappy.svg"
                className="w-50 h-50 mb-5 animate-float"
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
                {page.quizResults}
              </h2>
              <div className="mt-6 text-center">
                <p className="font-display text-4xl font-bold text-primary tabular-nums">
                  {display.summary.correctCount}/
                  {display.summary.totalQuestions}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatMessage(page.pctCorrect, {
                    pct: String(display.knowledgeEstimate.pct),
                  })}
                </p>
              </div>
              <p className="mt-6 text-center text-sm leading-relaxed text-muted-foreground">
                {display.message}
              </p>
            </div>

            {display.summary.quizReview &&
              display.summary.quizReview.wrong.length > 0 ? (
              <div className="mt-8 rounded-2xl border border-destructive/25 bg-destructive/5 p-6 sm:p-8">
                <h2 className="font-display text-center text-lg font-semibold">
                  {page.reviewWrongHeading}
                </h2>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  {page.reviewWrongLead}
                </p>
                <ul className="mt-6 space-y-5 text-left">
                  {display.summary.quizReview.wrong.map((row, i) => (
                    <li
                      key={`${i}-${row.question.slice(0, 48)}`}
                      className="rounded-lg border border-border bg-background/80 px-4 py-3"
                    >
                      {row.category ? (
                        <span className="inline-block rounded bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {row.category === "grammar"
                            ? page.quizCategoryGrammar
                            : row.category === "vocabulary"
                              ? page.quizCategoryVocabulary
                              : row.category === "comprehension"
                                ? page.quizCategoryComprehension
                                : row.category}
                        </span>
                      ) : null}
                      <p className="mt-2 text-sm font-medium text-foreground" translate="no">
                        {row.question}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground" translate="no">
                        {page.yourAnswer}{" "}
                        <span className="font-medium text-destructive">
                          {row.options[row.selectedIndex] ?? page.answerDash}
                        </span>
                        {" · "}
                        {page.correctLabel}{" "}
                        <span className="font-medium text-accent">
                          {row.options[row.correctIndex] ?? page.answerDash}
                        </span>
                      </p>
                      {row.explanation ? (
                        <p className="mt-3 text-sm leading-relaxed text-foreground">
                          {row.explanation}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="font-display text-lg font-semibold">
                  {page.wordsHeading}
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{page.wordsLead}</p>
              {display.summary.learnedWords.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  {page.wordsEmpty}
                </p>
              ) : (
                <ul className="mt-4 space-y-3" translate="no">
                  {display.summary.learnedWords.map((w) => (
                    <li
                      key={w.word}
                      className="rounded-lg border border-border/80 bg-background/50 px-3 py-2.5"
                    >
                      <span className="font-semibold text-foreground">
                        {w.word}
                      </span>
                      <span className="text-muted-foreground"> — </span>
                      <span className="text-sm text-muted-foreground" translate="yes">
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
                  {page.topicsHeading}
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{page.topicsLead}</p>

              {display.summary.levelTags.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {page.levelFocus}
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
                    {page.linkedTopics}
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
                    {page.lessonThemes}
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
                  {page.untaggedClipLead}
                  <strong>{display.summary.categoryName}</strong>
                  {page.untaggedClipTail}
                </p>
              ) : null}
            </div>

            <div className="mt-8">
              <ProfileCard title={page.knowledgeShiftTitle}>
                <div className="rounded-xl border border-border/40 bg-secondary/25 p-4">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {page.thisLesson}
                  </p>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {page.quizAdjustedSkills}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {page.quizAdjustedLead}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-sm font-semibold tabular-nums text-primary">
                      {display.knowledgeEstimate.pct}%
                    </span>
                  </div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {page.overall}
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
                      label={progress.listening}
                      deltaPoints={
                        display.knowledgeEstimate.listening +
                        WATCH_COMPLETE_LISTENING_POINTS
                      }
                      barClass="bg-sky-500/80 dark:bg-sky-400/90"
                      suffix=""
                    />
                    <KnowledgeShiftBar
                      label={progress.vocabulary}
                      deltaPoints={display.knowledgeEstimate.vocabulary}
                      barClass="bg-violet-500/80 dark:bg-violet-400/85"
                      suffix=""
                    />
                    <KnowledgeShiftBar
                      label={progress.grammar}
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
                {page.experienceEarned}
              </p>
              <p className="font-display mt-2 text-3xl font-bold text-foreground tabular-nums">
                {formatMessage(page.xpEarnedLine, {
                  xp: String(display.summary.xpEarned),
                  xpUnit: stats.xpUnit,
                })}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link
                  to="/catalog"
                  className="flex rounded-[15px] bg-primary px-6 py-4 text-sm font-semibold items-center justify-center text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]"
                >
                  {page.nextInCatalog}
                </Link>
                <Link
                  to={`/content/${videoId}`}
                  className="flex text-foreground/70 hover:text-white rounded-[15px] px-6 items-center justify-center gap-2 hover:cursor-pointer rounded-xlpx-8 py-4 text-sm font-semibold transition-colors hover:bg-muted-foreground/10"
                >
                  {page.reviewLesson}
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
