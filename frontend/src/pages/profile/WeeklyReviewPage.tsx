import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { formatMessage } from "../../lib/formatMessage";
import { useUser } from "../../context/UserContext";
import { SEO } from "../../components/SEO/SEO";
import { resolveCanonicalUrl } from "../../lib/siteUrl";
import { VideoQuiz } from "../../components/content-watch/VideoQuiz";
import type { VideoQuizCompleteSummary } from "../../components/content-watch/VideoQuiz";
import type { QuizQuestion } from "../../components/content-watch/defaultLessonSides";

type ApiTestRow = {
  id?: string;
  question?: string;
  questionType?: string;
  options?: string[];
  correctIndex?: number;
  category?: string;
  explanation?: string;
};

function mapWeeklyTestsToQuiz(tests: ApiTestRow[]): QuizQuestion[] {
  return tests.map((t, idx) => {
    const id =
      typeof t.id === "string" && t.id.trim().length > 0 ?
        t.id.trim()
      : `w${idx + 1}`;
    const opts = [...(t.options ?? [])];
    while (opts.length < 4) opts.push("—");
    const options = opts.slice(0, 4);
    let ci =
      typeof t.correctIndex === "number" && Number.isFinite(t.correctIndex) ?
        Math.floor(t.correctIndex)
      : 0;
    ci = Math.max(0, Math.min(options.length - 1, ci));
    const catRaw = t.category;
    const category =
      catRaw === "grammar" ? ("grammar" as const)
      : catRaw === "vocabulary" ? ("vocabulary" as const)
      : catRaw === "comprehension" ? ("comprehension" as const)
      : undefined;
    return {
      id,
      timestamp: "—",
      question: t.question ?? "",
      questionType: "multiple_choice",
      options,
      correct: ci,
      category,
      explanation:
        typeof t.explanation === "string" ? t.explanation : undefined,
    };
  });
}

/**
 * One mixed MCQ quiz per UTC week, generated from the learner’s watch history.
 */
export default function WeeklyReviewPage() {
  const { messages } = useLandingLocale();
  const w = messages.weeklyReviewPage;
  const [searchParams] = useSearchParams();
  const practiceRerunRequested =
    searchParams.get("rerun") === "1" ||
    searchParams.get("rerun")?.trim().toLowerCase() === "true";
  const { refreshProfile } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [gradingToken, setGradingToken] = useState<string | null>(null);
  const [quizVariant, setQuizVariant] = useState<"scored" | "practice">("scored");
  const [doneSummary, setDoneSummary] = useState<{
    correct: number;
    total: number;
    pct: number;
    xp: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBlockedMessage(null);
    setQuizQuestions(null);
    setGradingToken(null);
    setQuizVariant("scored");
    const testsUrl =
      practiceRerunRequested ?
        "/auth/weekly-review/tests?rerun=1"
      : "/auth/weekly-review/tests";
    void apiFetch(testsUrl, { method: "GET" })
      .then(async (r) => {
        const body: unknown = await r.json().catch(() => null);
        if (cancelled) return;
        if (!r.ok || !body || typeof body !== "object") {
          setError(w.blockedTitle);
          return;
        }
        const o = body as Record<string, unknown>;
        if (o.blockedReason != null || o.message != null) {
          const msg =
            typeof o.message === "string" && o.message.trim() ?
              o.message.trim()
            : w.blockedTitle;
          setBlockedMessage(msg);
          return;
        }
        const testsRaw = o.tests;
        const token =
          typeof o.gradingToken === "string" && o.gradingToken.length > 0 ?
            o.gradingToken
          : null;
        if (
          !Array.isArray(testsRaw) ||
          testsRaw.length === 0 ||
          token == null
        ) {
          setBlockedMessage(w.blockedTitle);
          return;
        }
        const isPractice =
          o.practiceReplay === true || practiceRerunRequested;
        setQuizVariant(isPractice ? "practice" : "scored");
        setQuizQuestions(
          mapWeeklyTestsToQuiz(testsRaw as ApiTestRow[]),
        );
        setGradingToken(token);
      })
      .catch(() => {
        if (!cancelled) setError(w.blockedTitle);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [w.blockedTitle, practiceRerunRequested]);

  const handleComplete = useCallback(
    async (summary: VideoQuizCompleteSummary) => {
      if (!gradingToken) return;
      try {
        const r = await apiFetch("/auth/weekly-review/tests/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: gradingToken,
            answers: summary.answersById,
          }),
        });
        const data: unknown = await r.json().catch(() => null);
        if (!r.ok) {
          const errMsg =
            data &&
            typeof data === "object" &&
            typeof (data as { message?: unknown }).message === "string"
              ? String((data as { message: string }).message)
              : w.submitFail;
          toast.error(errMsg);
          return;
        }
        if (!data || typeof data !== "object") {
          toast.error(w.submitFail);
          return;
        }
        const d = data as Record<string, unknown>;
        const correct = Number(d.correct ?? summary.correctCount);
        const total = Number(d.total ?? summary.totalQuestions);
        const pct = Number(d.percentage ?? 0);
        const xp = Number(d.xpAwarded ?? 0);
        setDoneSummary({
          correct: Number.isFinite(correct) ? correct : summary.correctCount,
          total: Number.isFinite(total) ? total : summary.totalQuestions,
          pct: Number.isFinite(pct) ? pct : 0,
          xp: Number.isFinite(xp) ? xp : 0,
        });
        const isPractice = quizVariant === "practice";
        if (!isPractice) {
          await refreshProfile().catch(() => undefined);
        }
        toast.success(
          formatMessage(
            isPractice ? w.practiceResultLine : w.resultLine,
            {
              correct: String(correct),
              total: String(total),
              pct: String(pct),
              xp: String(xp),
            },
          ),
        );
      } catch {
        toast.error(w.submitFail);
      }
    },
    [
      gradingToken,
      quizVariant,
      refreshProfile,
      w.practiceResultLine,
      w.resultLine,
      w.submitFail,
    ],
  );

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <SEO
        title={w.seoTitle}
        description={w.seoDescription}
        canonicalUrl={resolveCanonicalUrl("/profile/weekly-review")}
      />
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          to="/profile?tab=activity"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {w.backToProfile}
        </Link>
        <h1 className="font-display text-2xl font-bold">{w.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{w.lead}</p>
        {!loading && quizVariant === "practice" && !doneSummary && quizQuestions ?
          <div
            role="note"
            className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm text-foreground"
          >
            <p className="font-medium">{w.practiceBannerTitle}</p>
            <p className="mt-1 text-muted-foreground">{w.practiceBannerBody}</p>
          </div>
        : null}

        <div className="mt-8">
          {loading ?
            <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="size-8 animate-spin" aria-hidden />
              <p className="text-sm">{w.loading}</p>
            </div>
          : error ?
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
              {error}
            </p>
          : blockedMessage ?
            <p className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-foreground">
              {blockedMessage}
            </p>
          : doneSummary ?
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-lg font-semibold text-foreground">
                {formatMessage(
                  quizVariant === "practice" ?
                    w.practiceResultLine
                  : w.resultLine,
                  {
                    correct: String(doneSummary.correct),
                    total: String(doneSummary.total),
                    pct: String(doneSummary.pct),
                    xp: String(doneSummary.xp),
                  },
                )}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {quizVariant === "practice" ?
                  w.practiceFooter
                : w.retestNextWeek}
              </p>
            </div>
          : quizQuestions && gradingToken ?
            <div className="rounded-xl border border-border bg-card p-4">
              <VideoQuiz
                key={gradingToken.slice(0, 24)}
                questions={quizQuestions}
                isVideoComplete={true}
                onComplete={handleComplete}
              />
            </div>
          : null}
        </div>
      </div>
    </div>
  );
}
