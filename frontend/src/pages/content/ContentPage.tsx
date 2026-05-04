import { Link, useParams } from "react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, BookOpen, FileText, HelpCircle } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { captureEvent } from "../../lib/analytics";
import { cn } from "../../lib/utils";
import VideoPlayer from "../../components/VideoPlayer";
import { ChameleonMascot } from "../../components/ChameleonMascot";
import { VideoVocabulary } from "../../components/content-watch/VideoVocabulary";
import { VideoTranscript } from "../../components/content-watch/VideoTranscript";
import { useUser } from "../../context/UserContext";
import {
  LessonCompleteBanner,
  VideoQuiz,
} from "../../components/content-watch/VideoQuiz";
import {
  defaultQuizQuestions,
  type QuizQuestion,
  type TranscriptLine,
  type VocabularyItem,
} from "../../components/content-watch/defaultLessonSides";
import { parseWebVttTranscriptLines } from "../../lib/parseWebVtt";

const LESSON_XP = 150;

/** GET /content-video/:id/tests (Gemini generates tests + keyVocabulary together). */
type LessonSideBundle = {
  keyVocabulary?: { word?: string; definition?: string; example?: string }[];
  tests?: {
    question: string;
    options: string[];
    correctIndex: number;
  }[];
};

function mapApiTestsToQuiz(
  tests: NonNullable<LessonSideBundle["tests"]>,
): QuizQuestion[] {
  return tests.map((t, idx) => {
    const opts = [...(t.options ?? [])];
    while (opts.length < 4) opts.push("—");
    const options = opts.slice(0, 4);
    let ci =
      typeof t.correctIndex === "number" && Number.isFinite(t.correctIndex) ?
        Math.floor(t.correctIndex)
      : 0;
    ci = Math.max(0, Math.min(options.length - 1, ci));
    return {
      id: idx + 1,
      timestamp: "—",
      question: t.question ?? "",
      options,
      correct: ci,
    };
  });
}

function normalizeLessonVocabulary(
  raw: LessonSideBundle["keyVocabulary"],
): VocabularyItem[] {
  if (!Array.isArray(raw)) return [];
  const out: VocabularyItem[] = [];
  for (const row of raw) {
    const word = typeof row.word === "string" ? row.word.trim() : "";
    const definition =
      typeof row.definition === "string" ? row.definition.trim() : "";
    const example = typeof row.example === "string" ? row.example.trim() : "";
    if (word.length < 2 || definition.length < 3) continue;
    out.push({
      word,
      definition,
      example:
        example.length > 0
          ? example
          : `"${word}" — notice how it appears in the lesson audio.`,
    });
  }
  return out.slice(0, 12);
}

type TabId = "vocabulary" | "transcript" | "quiz";

const tabs: { id: TabId; label: string; icon: typeof BookOpen }[] = [
  { id: "vocabulary", label: "Vocabulary", icon: BookOpen },
  { id: "transcript", label: "Transcript", icon: FileText },
  { id: "quiz", label: "Quiz", icon: HelpCircle },
];

function ContentWatchHeader({
  rightLabel,
}: {
  rightLabel?: string;
}) {
  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-border border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto grid max-w-7xl grid-cols-3 items-center gap-3 px-4 py-3">
        <Link
          to="/catalog"
          className="flex shrink-0 items-center gap-2 justify-self-start text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm whitespace-nowrap">Back to catalog</span>
        </Link>

        <div className="flex min-w-0 items-center justify-center gap-2 justify-self-center">
          <ChameleonMascot size="sm" mood="happy" animate={false} />
          <span className="font-display truncate font-bold text-foreground">
            Exply
          </span>
        </div>

        <div className="min-h-[1.25rem] justify-self-end text-right text-xs text-muted-foreground sm:text-sm">
          {rightLabel?.trim() ? rightLabel : null}
        </div>
      </div>
    </header>
  );
}

function LoadingView() {
  return (
    <div className="min-h-screen bg-background">
      <ContentWatchHeader />
      <div className="mx-auto flex min-h-[70vh] max-w-7xl flex-col items-center justify-center gap-4 px-4 pt-20">
        <div
          className="border-muted h-14 w-14 animate-spin rounded-full border-4 border-t-primary border-solid"
          aria-hidden
        />
        <p className="text-sm font-medium text-muted-foreground">
          Loading lesson…
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  cta,
}: {
  title: string;
  description: string;
  cta: { to: string; label: string };
}) {
  return (
    <div className="min-h-screen bg-background">
      <ContentWatchHeader />
      <main className="mx-auto max-w-lg px-4 pt-28 pb-20 text-center sm:px-6">
        <div className="rounded-[2rem] border-2 border-dashed border-border bg-card/50 px-8 py-14">
          <div className="mb-4 text-4xl" aria-hidden>
            🎬
          </div>
          <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
          <Link
            to={cta.to}
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {cta.label}
          </Link>
        </div>
      </main>
    </div>
  );
}

function TabBar({
  activeTab,
  onTabChange,
  className,
}: {
  activeTab: TabId;
  onTabChange: (t: TabId) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex border-border border-b", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "-mb-px flex flex-1 items-center justify-center gap-2 border-border border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:flex-none sm:px-4",
            activeTab === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <tab.icon className="h-4 w-4 shrink-0" />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

function TabPanels({
  activeTab,
  isVideoComplete,
  onQuizComplete,
  vocabulary,
  quizQuestions,
  sideLoading,
  transcriptLines,
  transcriptLoading,
  playbackSec,
  onSeekTranscript,
}: {
  activeTab: TabId;
  isVideoComplete: boolean;
  onQuizComplete: () => void;
  vocabulary: VocabularyItem[];
  quizQuestions: QuizQuestion[];
  sideLoading: boolean;
  transcriptLines: TranscriptLine[];
  transcriptLoading: boolean;
  playbackSec: number;
  onSeekTranscript: (seconds: number) => void;
}) {
  return (
    <div className="py-6">
      {activeTab === "vocabulary" ?
        sideLoading ?
          <p className="text-center text-sm text-muted-foreground">
            Preparing personalised key vocabulary…
          </p>
        : <VideoVocabulary vocabulary={vocabulary} />
      : null}
      {activeTab === "transcript" ?
        (
          <VideoTranscript
            transcript={transcriptLines}
            loading={transcriptLoading}
            playbackSec={playbackSec}
            onSeek={onSeekTranscript}
          />
        )
      : null}
      {activeTab === "quiz" ? (
        <VideoQuiz
          questions={quizQuestions}
          isVideoComplete={isVideoComplete}
          onComplete={onQuizComplete}
        />
      ) : null}
    </div>
  );
}

export default function ContentPage() {
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const { id } = useParams();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<TabId>("vocabulary");
  const [isVideoComplete, setIsVideoComplete] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [videoData, setVideoData] = useState<{
    videoName: string;
    videoLink: string;
    videoDescription: string | null;
    content: { category: { name: string; description: string } };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lessonSideBundle, setLessonSideBundle] = useState<{
    vocabulary: VocabularyItem[];
    quizQuestions: QuizQuestion[];
  } | null>(null);
  const [sideBundleLoading, setSideBundleLoading] = useState(false);
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>(
    [],
  );
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [playbackSec, setPlaybackSec] = useState(0);

  const seekToCue = useCallback((seconds: number) => {
    const el = videoElRef.current;
    if (!el || !Number.isFinite(seconds)) return;
    try {
      el.currentTime = Math.max(0, seconds);
    } catch {
      /* ignore invalid seek */
    }
  }, []);

  const handleVideoEnded = useCallback(async () => {
    setIsVideoComplete(true);
    if (!id) return;
    const vid = Number.parseInt(String(id), 10);
    if (!Number.isFinite(vid) || vid <= 0) return;
    try {
      const res = await apiFetch(`/content-video/${vid}/watch-complete`, {
        method: "POST",
      });
      if (res.ok) {
        captureEvent("video_watch_complete", { content_video_id: vid });
      }
    } catch {
      /* non-blocking */
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchVideo = async () => {
      try {
        setLoading(true);
        setVideoData(null);
        const response = await apiFetch(`/content-video/${id}`, {
          method: "GET",
        });
        if (response.ok) {
          const data = await response.json();
          setVideoData(data);
        } else {
          setVideoData(null);
        }
      } catch (error) {
        console.error("Error loading video:", error);
        setVideoData(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchVideo();
  }, [id]);

  useEffect(() => {
    if (!id || !videoData) return;
    const vid = Number.parseInt(String(id), 10);
    if (!Number.isFinite(vid) || vid <= 0) return;
    let cancelled = false;
    setSideBundleLoading(true);
    const qs =
      user?.id != null ? `?userId=${encodeURIComponent(String(user.id))}` : "";
    void apiFetch(`/content-video/${vid}/tests${qs}`)
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) {
          setLessonSideBundle(null);
          return;
        }
        const bundle = (await r.json()) as LessonSideBundle;
        const vocabulary = normalizeLessonVocabulary(bundle.keyVocabulary);
        const quizQuestions =
          Array.isArray(bundle.tests) && bundle.tests.length > 0 ?
            mapApiTestsToQuiz(bundle.tests)
          : defaultQuizQuestions;
        setLessonSideBundle({ vocabulary, quizQuestions });
      })
      .catch(() => {
        if (!cancelled) setLessonSideBundle(null);
      })
      .finally(() => {
        if (!cancelled) setSideBundleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, videoData, user?.id]);

  useEffect(() => {
    if (!id || !videoData) return;
    const vid = Number.parseInt(String(id), 10);
    if (!Number.isFinite(vid) || vid <= 0) return;
    let cancelled = false;
    setTranscriptLoading(true);
    setTranscriptLines([]);
    void apiFetch(`/content-video/${vid}/captions`)
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) {
          setTranscriptLines([]);
          return;
        }
        const raw = await r.text();
        setTranscriptLines(parseWebVttTranscriptLines(raw));
      })
      .catch(() => {
        if (!cancelled) setTranscriptLines([]);
      })
      .finally(() => {
        if (!cancelled) setTranscriptLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, videoData]);

  useEffect(() => {
    setIsVideoComplete(false);
    setQuizCompleted(false);
    setActiveTab("vocabulary");
    setLessonSideBundle(null);
    setTranscriptLines([]);
    setPlaybackSec(0);
    setTranscriptLoading(false);
  }, [id]);

  const headerRight = quizCompleted
    ? `${LESSON_XP} XP`
    : isVideoComplete
      ? "Quiz unlocked"
      : `${LESSON_XP} XP available`;

  if (loading) {
    return <LoadingView />;
  }

  if (!id) {
    return (
      <EmptyState
        title="No video selected"
        description="Pick a lesson from your catalog."
        cta={{ to: "/catalog", label: "Browse catalog" }}
      />
    );
  }

  if (!videoData) {
    return (
      <EmptyState
        title="Video not found"
        description="This clip may have been removed or the link is wrong."
        cta={{ to: "/catalog", label: "Back to catalog" }}
      />
    );
  }

  const descriptionBlurb =
    videoData.videoDescription?.trim() ||
    videoData.content.category.description?.trim() ||
    "Practice listening and speaking with curated clips from your catalog.";

  const vocabForUi = lessonSideBundle?.vocabulary ?? [];
  const quizForUi = lessonSideBundle?.quizQuestions ?? defaultQuizQuestions;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <ContentWatchHeader rightLabel={headerRight} />

      <main className="pt-16">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="overflow-hidden rounded-xl border border-border bg-muted ring-1 ring-border/40">
                <VideoPlayer
                  src={videoData.videoLink}
                  onEnded={handleVideoEnded}
                  onPlaybackTime={(t) => setPlaybackSec(t)}
                  onVideoMount={(el) => {
                    videoElRef.current = el;
                  }}
                  className="rounded-none border-0"
                />
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                    {videoData.content.category.name}
                  </span>
                  {isVideoComplete ? (
                    <span className="text-sm text-accent">Watched</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Watch to unlock quiz
                    </span>
                  )}
                </div>
                <h1 className="font-display mb-3 text-2xl font-bold sm:text-3xl">
                  {videoData.videoName}
                </h1>
                <p className="leading-relaxed text-muted-foreground">
                  {descriptionBlurb}
                </p>
              </div>

              <div className="lg:hidden">
                <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
                <TabPanels
                  activeTab={activeTab}
                  isVideoComplete={isVideoComplete}
                  onQuizComplete={() => setQuizCompleted(true)}
                  vocabulary={vocabForUi}
                  quizQuestions={quizForUi}
                  sideLoading={sideBundleLoading}
                  transcriptLines={transcriptLines}
                  transcriptLoading={transcriptLoading}
                  playbackSec={playbackSec}
                  onSeekTranscript={seekToCue}
                />
              </div>
            </div>

            <div className="hidden lg:block">
              <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
              <div className="mt-0 max-h-[min(600px,70vh)] overflow-y-auto rounded-xl border border-border bg-card p-4">
                {activeTab === "vocabulary" ?
                  sideBundleLoading ?
                    <p className="text-center text-sm text-muted-foreground">
                      Preparing personalised key vocabulary…
                    </p>
                  : <VideoVocabulary vocabulary={vocabForUi} />
                : null}
                {activeTab === "transcript" ?
                  (
                    <VideoTranscript
                      transcript={transcriptLines}
                      loading={transcriptLoading}
                      playbackSec={playbackSec}
                      onSeek={seekToCue}
                    />
                  )
                : null}
                {activeTab === "quiz" ? (
                  <VideoQuiz
                    questions={quizForUi}
                    isVideoComplete={isVideoComplete}
                    onComplete={() => setQuizCompleted(true)}
                  />
                ) : null}
              </div>

              {quizCompleted ? (
                <div className="mt-6">
                  <LessonCompleteBanner xpEarned={LESSON_XP} />
                </div>
              ) : null}
            </div>
          </div>

          {quizCompleted ? (
            <div className="mt-8 lg:hidden">
              <LessonCompleteBanner xpEarned={LESSON_XP} />
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
