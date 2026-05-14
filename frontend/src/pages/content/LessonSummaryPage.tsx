import { Link, useLocation, useParams } from "react-router";
import { useMemo, useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Tags } from "lucide-react";
import { ChameleonMascot } from "../../components/ChameleonMascot";
import { ProfileCard } from "../../components/profile/ProfileCard";
import { KnowledgeShiftBar } from "../../components/profile/KnowledgeMeters";
import { apiFetch } from "../../lib/api";
import { formatMessage } from "../../lib/formatMessage";
import { cn } from "../../lib/utils";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { useUser } from "../../context/UserContext";
import { vocabularyHintsTargetLang } from "../../lib/nativeLanguageCode";
import {
  estimatedLessonKnowledgeFromQuizPct,
  WATCH_COMPLETE_LISTENING_POINTS,
} from "../../lib/lessonKnowledgeEstimate";
import type { QuizWrongReviewItem } from "../../components/content-watch/VideoQuiz";

export type LessonWordEntry = {
  word: string;
  definition: string;
  /** Gloss in the learner’s native language when hints / API provided it (see lesson vocabulary sidebar). */
  nativeTranslation?: string;
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
    const w = row as {
      word?: unknown;
      definition?: unknown;
      nativeTranslation?: unknown;
      translation?: unknown;
    };
    const word = typeof w.word === "string" ? w.word.trim() : "";
    const definition =
      typeof w.definition === "string" ? w.definition.trim() : "";
    const nativeRaw =
      typeof w.nativeTranslation === "string"
        ? w.nativeTranslation.trim()
        : typeof w.translation === "string"
          ? w.translation.trim()
          : "";
    const nativeTranslation =
      nativeRaw.length > 0 ? nativeRaw.slice(0, 500) : undefined;
    if (word.length < 2 || definition.length < 2) continue;
    out.push({
      word,
      definition,
      ...(nativeTranslation ? { nativeTranslation } : {}),
    });
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
    const options = Array.isArray(w.options) ? w.options.filter((x): x is string => typeof x === "string") : [];
    const si = typeof w.selectedIndex === "number" ? w.selectedIndex : Number.NaN;
    const ci = typeof w.correctIndex === "number" ? w.correctIndex : Number.NaN;
    if (!question.trim() || options.length < 2 || !Number.isFinite(si) || !Number.isFinite(ci)) {
      continue;
    }
    const explanation =
      typeof w.explanation === "string" ? w.explanation.trim() : undefined;
    const cat = w.category;
    const category =
      cat === "grammar" || cat === "comprehension" || cat === "vocabulary" ?
        cat
      : undefined;
    wrong.push({
      question,
      options,
      selectedIndex: si,
      correctIndex: ci,
      explanation: explanation && explanation.length > 0 ? explanation : undefined,
      category,
    });
  }
  return wrong.length > 0 ? { wrong } : undefined;
}

function labelForQuizReviewCategory(
  category: NonNullable<QuizWrongReviewItem["category"]>,
  ls: {
    readonly quizCategoryGrammar: string;
    readonly quizCategoryVocabulary: string;
    readonly quizCategoryComprehension: string;
  },
): string {
  switch (category) {
    case "grammar":
      return ls.quizCategoryGrammar;
    case "vocabulary":
      return ls.quizCategoryVocabulary;
    case "comprehension":
      return ls.quizCategoryComprehension;
    default:
      return category;
  }
}

function normalizeWrittenSummaryScore(
  raw: unknown,
): number | null | undefined {
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
      writtenSummaryScore: normalizeWrittenSummaryScore(
        p.writtenSummaryScore,
      ),
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

function parseVideoJson(data: unknown, fallbackVideoName: string): VideoMeta | null {
  if (!data || typeof data !== "object") return null;
  const d = data as {
    videoName?: unknown;
    videoDescription?: unknown;
    content?: unknown;
  };
  const name =
    typeof d.videoName === "string" ? d.videoName : fallbackVideoName;
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
  const { messages, locale } = useLandingLocale();
  const ls = messages.lessonSummaryPage;
  const pp = messages.profileProgress;
  const xpUnit = messages.profileStats.xpUnit;
  const catalogNav = messages.catalogShell.navCatalog;
  const backToCatalogLabel = messages.lesson.backToCatalog;
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
      const meta = parseVideoJson(data, ls.fallbackLessonTitle);
      if (meta) setMetaOnly(meta);
    });
    return () => {
      cancelled = true;
    };
  }, [videoId, summary, ls.fallbackLessonTitle]);

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
          ? ls.moodStrong
          : knowledgeEstimate.pct >= 50
            ? ls.moodGood
            : ls.moodReview;
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
  }, [summary, metaOnly, knowledgeEstimate, ls]);

  const learnedWordsFingerprint = useMemo(() => {
    if (display.kind !== "full") return "";
    return display.summary.learnedWords
      .map((w) =>
        [w.word, w.definition, (w.nativeTranslation ?? "").trim()].join("\u001f"),
      )
      .join("\u001e");
  }, [display]);

  const [wordRowsWithHints, setWordRowsWithHints] = useState<
    LessonWordEntry[] | null
  >(null);
  const { user } = useUser();

  useEffect(() => {
    let cancelled = false;
    setWordRowsWithHints(null);
    if (display.kind !== "full") return;
    const rows = display.summary.learnedWords;
    if (rows.length === 0) return;
    const targetLang = vocabularyHintsTargetLang(
      user?.nativeLanguage?.trim(),
      locale,
    );
    const needsHints = rows.some((w) => !(w.nativeTranslation ?? "").trim());
    if (!needsHints || targetLang === null) {
      return;
    }
    void apiFetch(`/content-video/vocabulary-hints`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        words: rows.map((w) => w.word),
        targetLang,
      }),
    })
      .then(async (r) => {
        if (cancelled || !r.ok) return;
        const data = (await r.json()) as {
          hints?: Record<
            string,
            { translation: string | null; pronunciation?: string | null }
          >;
        };
        const hints = data.hints ?? {};
        const merged = rows.map((w) => {
          const hintTr =
            hints[w.word.trim().toLowerCase()]?.translation?.trim();
          const existing = (w.nativeTranslation ?? "").trim();
          if (existing.length > 0) return w;
          if (!hintTr) return w;
          return {
            ...w,
            nativeTranslation: hintTr.slice(0, 500),
          };
        });
        if (!cancelled) setWordRowsWithHints(merged);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [learnedWordsFingerprint, display.kind, locale, user?.nativeLanguage]);

  const learnedWordsToShow =
    display.kind === "full"
      ? (wordRowsWithHints ?? display.summary.learnedWords)
      : [];

  if (!videoId) {
    return (
      <div className="min-h-screen bg-background px-4 pt-24 text-center">
        <p className="text-muted-foreground">{ls.missingLesson}</p>
        <Link
          to="/catalog"
          className="mt-4 inline-block text-sm font-medium text-primary"
        >
          {backToCatalogLabel}
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
            <span className="text-sm">{catalogNav}</span>
          </Link>
          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            <ChameleonMascot size="sm" mood="happy" animate={false} />
            <span className="font-display truncate font-bold">{ls.pageTitle}</span>
          </div>
          <div className="w-16 shrink-0" aria-hidden />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        {display.kind === "empty" ? (
          <div className="rounded-2xl border border-border bg-card/50 p-8 text-center">
            <p className="text-muted-foreground">{ls.emptyLead}</p>
            <Link
              to={`/content/${videoId}`}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              {ls.openLesson}
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
            <p className="mt-4 text-sm text-muted-foreground">{ls.metaLead}</p>
            <Link
              to={`/content/${videoId}`}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              {ls.continueLesson}
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
                {ls.quizResults}
              </h2>
              <div className="mt-6 text-center">
                <p className="font-display text-4xl font-bold text-primary tabular-nums">
                  {display.summary.correctCount}/{display.summary.totalQuestions}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatMessage(ls.pctCorrect, {
                    pct: display.knowledgeEstimate.pct,
                  })}
                </p>
              </div>
              <p className="mt-6 text-center text-sm leading-relaxed text-muted-foreground">
                {display.message}
              </p>
            </div>

            {display.summary.writtenSummaryText ||
            (typeof display.summary.writtenSummaryScore === "number" &&
              display.summary.writtenSummaryScore >= 1 &&
              display.summary.writtenSummaryScore <= 10) ||
            (typeof display.summary.writtenSummaryFeedback === "string" &&
              display.summary.writtenSummaryFeedback.trim().length > 0) ? (
              <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
                <h2 className="font-display text-lg font-semibold">
                  {ls.writtenSummaryHeading}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {ls.writtenSummaryLead}
                </p>
                {typeof display.summary.writtenSummaryScore === "number" &&
                display.summary.writtenSummaryScore >= 1 &&
                display.summary.writtenSummaryScore <= 10 ? (
                  <p className="mt-4 text-sm font-semibold tabular-nums text-primary">
                    {formatMessage(ls.summaryScoreLine, {
                      score: display.summary.writtenSummaryScore,
                    })}
                  </p>
                ) : null}
                {display.summary.writtenSummaryText ? (
                  <blockquote className="mt-4 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm leading-relaxed text-foreground">
                    {display.summary.writtenSummaryText}
                  </blockquote>
                ) : null}
                {typeof display.summary.writtenSummaryFeedback === "string" &&
                display.summary.writtenSummaryFeedback.trim().length > 0 ? (
                  <p className="mt-4 text-sm leading-relaxed text-foreground">
                    {display.summary.writtenSummaryFeedback.trim()}
                  </p>
                ) : display.summary.writtenSummaryText?.trim() ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    {ls.noCoachComment}
                  </p>
                ) : null}
              </div>
            ) : null}

            {display.summary.quizReview &&
            display.summary.quizReview.wrong.length > 0 ? (
              <div className="mt-8 rounded-2xl border border-destructive/25 bg-destructive/5 p-6 sm:p-8">
                <h2 className="font-display text-center text-lg font-semibold">
                  {ls.reviewWrongHeading}
                </h2>
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  {ls.reviewWrongLead}
                </p>
                <ul className="mt-6 space-y-5 text-left">
                  {display.summary.quizReview.wrong.map((row, i) => (
                    <li
                      key={`${i}-${row.question.slice(0, 48)}`}
                      className="rounded-lg border border-border bg-background/80 px-4 py-3"
                    >
                      {row.category ? (
                        <span className="inline-block rounded bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {labelForQuizReviewCategory(row.category, ls)}
                        </span>
                      ) : null}
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {row.question}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {ls.yourAnswer}{" "}
                        <span className="font-medium text-destructive">
                          {row.options[row.selectedIndex] ?? ls.answerDash}
                        </span>
                        {" · "}
                        {ls.correctLabel}{" "}
                        <span className="font-medium text-accent">
                          {row.options[row.correctIndex] ?? ls.answerDash}
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
                  {ls.wordsHeading}
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{ls.wordsLead}</p>
              {learnedWordsToShow.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  {ls.wordsEmpty}
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {learnedWordsToShow.map((w) => (
                    <li
                      key={w.word}
                      className="rounded-lg border border-border/80 bg-background/50 px-3 py-2.5"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="font-semibold text-foreground">
                            {w.word}
                          </span>
                          {w.nativeTranslation ?
                            <span
                              className="text-sm text-muted-foreground"
                              title={ls.wordsNativeTooltip}
                            >
                              ({w.nativeTranslation})
                            </span>
                          : null}
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {w.definition}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
              <div className="flex items-center gap-2">
                <Tags className="h-5 w-5 text-primary" aria-hidden />
                <h2 className="font-display text-lg font-semibold">
                  {ls.topicsHeading}
                </h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{ls.topicsLead}</p>

              {display.summary.levelTags.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {ls.levelFocus}
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
                    {ls.linkedTopics}
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
                    {ls.lessonThemes}
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
                  {ls.untaggedClipLead}
                  <strong>{display.summary.categoryName}</strong>
                  {ls.untaggedClipTail}
                </p>
              ) : null}
            </div>

            <div className="mt-8">
              <ProfileCard title={ls.knowledgeShiftTitle}>
                <div className="rounded-xl border border-border/40 bg-secondary/25 p-4">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {ls.thisLesson}
                  </p>
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {ls.quizAdjustedSkills}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ls.quizAdjustedLead}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-sm font-semibold tabular-nums text-primary">
                      {display.knowledgeEstimate.pct}%
                    </span>
                  </div>
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {ls.overall}
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
                      label={pp.listening}
                      deltaPoints={
                        display.knowledgeEstimate.listening +
                        WATCH_COMPLETE_LISTENING_POINTS
                      }
                      barClass="bg-sky-500/80 dark:bg-sky-400/90"
                      suffix=""
                    />
                    <KnowledgeShiftBar
                      label={pp.vocabulary}
                      deltaPoints={display.knowledgeEstimate.vocabulary}
                      barClass="bg-violet-500/80 dark:bg-violet-400/85"
                      suffix=""
                    />
                    <KnowledgeShiftBar
                      label={pp.grammar}
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
                {ls.experienceEarned}
              </p>
              <p className="font-display mt-2 text-3xl font-bold text-foreground tabular-nums">
                {formatMessage(ls.xpEarnedLine, {
                  xp: display.summary.xpEarned,
                  xpUnit,
                })}
              </p>
              <div className="mt-8 flex justify-center">
                <Link
                  to="/catalog"
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {catalogNav}
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
