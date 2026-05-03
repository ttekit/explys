import { Link, useParams } from "react-router";
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, BookOpen, FileText, HelpCircle } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { cn } from "../../lib/utils";
import VideoPlayer from "../../components/VideoPlayer";
import { ChameleonMascot } from "../../components/ChameleonMascot";
import { VideoVocabulary } from "../../components/content-watch/VideoVocabulary";
import { VideoTranscript } from "../../components/content-watch/VideoTranscript";
import {
  LessonCompleteBanner,
  VideoQuiz,
} from "../../components/content-watch/VideoQuiz";
import {
  defaultQuizQuestions,
  defaultTranscript,
  defaultVocabulary,
} from "../../components/content-watch/defaultLessonSides";

const LESSON_XP = 150;

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
            CineLingo
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
}: {
  activeTab: TabId;
  isVideoComplete: boolean;
  onQuizComplete: () => void;
}) {
  return (
    <div className="py-6">
      {activeTab === "vocabulary" ? (
        <VideoVocabulary vocabulary={defaultVocabulary} />
      ) : null}
      {activeTab === "transcript" ? (
        <VideoTranscript transcript={defaultTranscript} />
      ) : null}
      {activeTab === "quiz" ? (
        <VideoQuiz
          questions={defaultQuizQuestions}
          isVideoComplete={isVideoComplete}
          onComplete={onQuizComplete}
        />
      ) : null}
    </div>
  );
}

export default function ContentPage() {
  const { id } = useParams();
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

  const handleVideoEnded = useCallback(() => setIsVideoComplete(true), []);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchVideo = async () => {
      try {
        setLoading(true);
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
    setIsVideoComplete(false);
    setQuizCompleted(false);
    setActiveTab("vocabulary");
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
                />
              </div>
            </div>

            <div className="hidden lg:block">
              <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
              <div className="mt-0 max-h-[min(600px,70vh)] overflow-y-auto rounded-xl border border-border bg-card p-4">
                {activeTab === "vocabulary" ? (
                  <VideoVocabulary vocabulary={defaultVocabulary} />
                ) : null}
                {activeTab === "transcript" ? (
                  <VideoTranscript transcript={defaultTranscript} />
                ) : null}
                {activeTab === "quiz" ? (
                  <VideoQuiz
                    questions={defaultQuizQuestions}
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
