import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link, useParams } from "react-router";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { VideoQuiz } from "../../components/content-watch/VideoQuiz";
import type { VideoQuizCompleteSummary } from "../../components/content-watch/VideoQuiz";
import type { QuizQuestion } from "../../components/content-watch/defaultLessonSides";
import { CatalogSidebar } from "../../components/catalog/CatalogSidebar";
import { SEO } from "../../components/SEO/SEO";
import { resolveCanonicalUrl } from "../../lib/siteUrl";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { useUser } from "../../context/UserContext";
import { formatMessage } from "../../lib/formatMessage";
import {
  generateLearnerRecap,
  submitLearnerRecap,
  type GenerateRecapResponse,
  type RecapKind,
} from "../../lib/learnerRecap";
import { cn } from "../../lib/utils";
import { appEn } from "../../locales/app/en";
import { appUk } from "../../locales/app/uk";

function parseKind(raw: string | undefined): RecapKind | null {
  if (raw === "mistakes" || raw === "weekly" || raw === "monthly") {
    return raw;
  }
  return null;
}

function mapApiTestsToQuiz(
  tests: GenerateRecapResponse["tests"],
): QuizQuestion[] {
  return tests.map((t, idx) => {
    const id =
      typeof t.id === "string" && t.id.trim().length > 0
        ? t.id.trim()
        : `r${idx + 1}`;
    const opts = [...(t.options ?? [])];
    while (opts.length < 4) opts.push("—");
    const options = opts.slice(0, 4);
    let ci =
      typeof t.correctIndex === "number" && Number.isFinite(t.correctIndex)
        ? Math.floor(t.correctIndex)
        : 0;
    ci = Math.max(0, Math.min(options.length - 1, ci));
    const catRaw = t.category;
    const category =
      catRaw === "grammar"
        ? ("grammar" as const)
        : catRaw === "vocabulary"
          ? ("vocabulary" as const)
          : catRaw === "comprehension"
            ? ("comprehension" as const)
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

export default function LearnerRecapQuizPage() {
  const { kind: kindParam } = useParams<{ kind: string }>();
  const kind = parseKind(kindParam);
  const { user } = useUser();
  const { locale } = useLandingLocale();
  const R = locale === "uk" ? appUk.recapQuizPage : appEn.recapQuizPage;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [loading, setLoading] = useState(() => kind !== null);
  const [blocked, setBlocked] = useState<string | null>(() =>
    kind ? null : R.invalidKind,
  );
  const [bundle, setBundle] = useState<GenerateRecapResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    correct: number;
    total: number;
    percentage: number;
  } | null>(null);

  const questions = useMemo(
    () => (bundle ? mapApiTestsToQuiz(bundle.tests) : []),
    [bundle],
  );

  const [prevKind, setPrevKind] = useState(kind);
  if (kind !== prevKind) {
    setPrevKind(kind);
    if (!kind) {
      setBlocked(R.invalidKind);
      setLoading(false);
      setBundle(null);
      setResult(null);
    } else {
      setBlocked(null);
      setLoading(true);
      setBundle(null);
      setResult(null);
    }
  }

  useEffect(() => {
    if (!kind) return;
    let cancelled = false;
    void (async () => {
      const data = await generateLearnerRecap(kind);
      if (cancelled) return;
      if (data && "error" in data) {
        setBlocked(data.error);
        setLoading(false);
        return;
      }
      if (
        !data?.gradingToken ||
        !Array.isArray(data.tests) ||
        data.tests.length === 0
      ) {
        setBlocked(R.generateFailed);
        setLoading(false);
        return;
      }
      setBundle(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, R.generateFailed, R.invalidKind]);

  const handleComplete = useCallback(
    async (summary: VideoQuizCompleteSummary) => {
      if (!kind || !bundle?.gradingToken || submitting) return;
      const numericAnswers: Record<string, number> = {};
      for (const [id, v] of Object.entries(summary.answersById)) {
        if (typeof v === "number" && Number.isFinite(v)) {
          numericAnswers[id] = Math.floor(v);
        }
      }
      setSubmitting(true);
      const res = await submitLearnerRecap(
        kind,
        bundle.gradingToken,
        numericAnswers,
      );
      setSubmitting(false);
      if (!res) {
        toast.error(R.submitFailed);
        return;
      }
      setResult({
        correct: res.correct,
        total: res.total,
        percentage: res.percentage,
      });
      toast.success(
        formatMessage(R.resultToast, {
          pct: String(Math.round(res.percentage)),
        }),
      );
    },
    [kind, bundle, submitting, R.submitFailed, R.resultToast],
  );

  const pageTitle = bundle?.recapLabel ?? R.titleFallback;

  return (
    <RecapShell
      user={user}
      sidebarCollapsed={sidebarCollapsed}
      onCollapsedChange={setSidebarCollapsed}
      title={pageTitle}
    >
      <RecapHeader
        title={pageTitle}
        backLabel={R.backToLessons}
        lead={R.lead}
      />

      <RecapBody>
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2
              className="h-10 w-10 animate-spin text-primary"
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">{R.loading}</p>
          </div>
        ) : blocked ? (
          <CenterBlock>
            <p className="font-medium text-foreground">{R.blockedTitle}</p>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {blocked}
            </p>
            <Link
              to="/watched-lessons"
              className="mt-6 text-sm font-medium text-primary hover:underline"
            >
              {R.backToLessons}
            </Link>
          </CenterBlock>
        ) : result ? (
          <CenterBlock>
            <img src={`${import.meta.env.BASE_URL}Icon.svg`} className="w-20 h-25 mb-3"></img>
            <p className="font-display text-xl font-semibold">{R.doneTitle}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatMessage(R.resultLine, {
                correct: String(result.correct),
                total: String(result.total),
                pct: String(Math.round(result.percentage)),
              })}
            </p>
            <Link
              to="/watched-lessons"
              className="mt-4 flex rounded-[15px] bg-primary px-6 py-3 text-sm font-semibold items-center justify-center text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]"
            >
              {R.backToLessons}
            </Link>
          </CenterBlock>
        ) : questions.length > 0 ? (
          <RecapQuizWrap submitting={submitting}>
            <VideoQuiz
              questions={questions}
              isVideoComplete
              onComplete={(s) => void handleComplete(s)}
            />
          </RecapQuizWrap>
        ) : null}
      </RecapBody>
    </RecapShell>
  );
}

function RecapShell(props: {
  user: ReturnType<typeof useUser>["user"];
  sidebarCollapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <SEO
        title={props.title}
        description={props.title}
        canonicalUrl={resolveCanonicalUrl("/watched-lessons")}
        noindex
      />
      <RecapLayout
        user={props.user}
        collapsed={props.sidebarCollapsed}
        onCollapsedChange={props.onCollapsedChange}
      >
        {props.children}
      </RecapLayout>
    </div>
  );
}

function RecapLayout(props: {
  user: ReturnType<typeof useUser>["user"];
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex">
        <CatalogSidebar
          onSelectLevel={() => {}}
          reserveTopNavSpace={false}
          collapsed={props.collapsed}
          onCollapsedChange={props.onCollapsedChange}
        />
      <main
        className={cn(
          "ml-0 flex-1 pb-28 lg:pb-12",
          props.collapsed ? "lg:ml-20" : "lg:ml-64",
        )}
      >
        {props.children}
      </main>
    </div>
  );
}

function RecapHeader(props: {
  title: string;
  backLabel: string;
  lead: string;
}) {
  return (
    <div className="border-border border-b bg-card/30 px-4 py-6 sm:px-6 lg:px-8">
      <Link
        to="/watched-lessons"
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {props.backLabel}
      </Link>
      <h1 className="font-display text-2xl font-bold tracking-tight">
        {props.title}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{props.lead}</p>
    </div>
  );
}

function RecapBody({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">{children}</div>;
}

function CenterBlock({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      {children}
    </div>
  );
}

function RecapQuizWrap(props: { submitting: boolean; children: ReactNode }) {
  return (
    <div className={cn(props.submitting && "pointer-events-none opacity-60")}>
      {props.children}
    </div>
  );
}
