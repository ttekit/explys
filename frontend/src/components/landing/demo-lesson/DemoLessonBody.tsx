import type {
  VocabularyItem,
  TranscriptLine,
  QuizQuestion,
} from "../../content-watch/defaultLessonSides";
import type { VideoQuizCompleteSummary } from "../../content-watch/VideoQuiz";
import { BookOpen, FileText, HelpCircle } from "lucide-react";
import type { DemoMode } from "./DemoHeader";
import { useDemoLesson } from "../../../hooks/useDemoLesson";
import VideoPlayer from "../../VideoPlayer";
import { VideoVocabulary } from "../../content-watch/VideoVocabulary";
import { VideoTranscript } from "../../content-watch/VideoTranscript";
import { VideoQuiz } from "../../content-watch/VideoQuiz";
import { DemoQuizResult } from "./DemoQuizResult";
import { useLandingLocale } from "../../../context/LandingLocaleContext";
import { cn } from "../../../lib/utils";
import type { TabId } from "../../../lib/lesson-utils";
import { useMemo } from "react";
import type { SubtitleTrack } from "../../VideoPlayer";

interface DemoLessonBodyProps {
  mode: DemoMode;
  onOpenInstructions: () => void;
}

const tabs: { id: TabId; label: string; icon: typeof BookOpen }[] = [
  { id: "vocabulary", label: "Vocabulary", icon: BookOpen },
  { id: "transcript", label: "Transcript", icon: FileText },
  { id: "quiz", label: "Quiz", icon: HelpCircle },
];

function TabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (t: TabId) => void;
}) {
  return (
    <div className="flex border-border border-b">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "-mb-px flex flex-1 items-center hover:cursor-pointer justify-center gap-2 border-border border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:flex-none sm:px-4",
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

function Panels({
  activeTab,
  vocabulary,
  transcriptLines,
  transcriptLoading,
  playbackSec,
  onSeek,
  isVideoComplete,
  quizQuestions,
  quizResult,
  onQuizComplete,
  onRetryQuiz,
}: {
  activeTab: TabId;
  vocabulary: VocabularyItem[];
  transcriptLines: TranscriptLine[];
  transcriptLoading: boolean;
  playbackSec: number;
  onSeek: (s: number) => void;
  isVideoComplete: boolean;
  quizQuestions: QuizQuestion[];
  quizResult: VideoQuizCompleteSummary | null;
  onQuizComplete: (s: VideoQuizCompleteSummary) => void;
  onRetryQuiz: () => void;
}) {
  return (
    <div className="py-6">
      <div className={activeTab === "vocabulary" ? "block" : "hidden"}>
        <VideoVocabulary vocabulary={vocabulary} />
      </div>
      <div className={activeTab === "transcript" ? "block" : "hidden"}>
        <VideoTranscript
          transcript={transcriptLines}
          loading={transcriptLoading}
          playbackSec={playbackSec}
          onSeek={onSeek}
          vocabulary={vocabulary}
        />
      </div>
      <div className={activeTab === "quiz" ? "block" : "hidden"}>
        {quizResult ? (
          <DemoQuizResult result={quizResult} onRetry={onRetryQuiz} />
        ) : (
          <VideoQuiz
            key="demo-quiz"
            questions={quizQuestions}
            isVideoComplete={isVideoComplete}
            onComplete={onQuizComplete}
          />
        )}
      </div>
    </div>
  );
}

export default function DemoLessonBody({
  mode,
  onOpenInstructions,
}: DemoLessonBodyProps) {
  const { messages } = useLandingLocale();
  const demo = messages.demoLessonPage;

  const {
    data,
    activeTab,
    setActiveTab,
    playbackSec,
    isVideoComplete,
    quizResult,
    transcriptLines,
    transcriptLinesUk,
    transcriptLoading,
    handlePlaybackTime,
    handlePlaybackFraction,
    handleVideoEnded,
    seekToCue,
    onVideoMount,
    handleQuizComplete,
    retryQuiz,
  } = useDemoLesson(mode);

  const content =
    mode === "quickTry" ? demo.quickTryContent : demo.wholeLessonContent;

  const playerTranscripts = useMemo(() => {
    if (!transcriptLines || transcriptLines.length === 0) return undefined;
    
    const tracks: SubtitleTrack[] = [];
    
    // We add the English transcript.
    tracks.push({
      id: "en",
      label: "English",
      cues: transcriptLines.map((cue: any) => ({
        startSec: cue.startSec,
        endSec: cue.endSec,
        text: cue.text,
      })),
    });

    // For the demo lesson, we use transcriptLinesUk if available.
    if (transcriptLinesUk && transcriptLinesUk.length > 0) {
      tracks.push({
        id: "uk",
        label: "Українська",
        cues: transcriptLinesUk.map((cue: any) => ({
          startSec: cue.startSec,
          endSec: cue.endSec,
          text: cue.text,
        })),
      });
    }

    return tracks;
  }, [transcriptLines, transcriptLinesUk]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 max-h-fit">
      <div className="flex flex-row justify-between mb-4">
        <div className="flex flex-col">
          <p className="text-2xl font-bold mb-1">{content.title}</p>
          <p className="text-muted-foreground">{content.describtion}</p>
        </div>
        <button
          type="button"
          onClick={onOpenInstructions}
          className="rounded-full bg-primary/30 hover:cursor-pointer hover:bg-primary/60 w-fit px-4 py-1 m-1 h-fit transition-all duration-200"
        >
          {demo.howToUse}
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-xl border border-border bg-muted ring-1 ring-border/40">
            <VideoPlayer
              key={mode}
              src={data.videoLink}
              transcript={transcriptLines}
              transcripts={playerTranscripts}
              onEnded={handleVideoEnded}
              onPlaybackTime={handlePlaybackTime}
              onPlaybackFraction={handlePlaybackFraction}
              onVideoMount={onVideoMount}
              className="rounded-none border-0"
            />
          </div>

          <div>
            <h1 className="font-display mb-3 text-2xl font-bold sm:text-3xl">
              {data.videoName}
            </h1>
            <p className="leading-relaxed text-muted-foreground">
              {data.videoDescription}
            </p>
          </div>

          <div className="lg:hidden">
            <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
            <Panels
              key={mode}
              activeTab={activeTab}
              vocabulary={data.vocabulary}
              transcriptLines={transcriptLines}
              transcriptLoading={transcriptLoading}
              playbackSec={playbackSec}
              onSeek={seekToCue}
              isVideoComplete={isVideoComplete}
              quizQuestions={data.quizQuestions}
              quizResult={quizResult}
              onQuizComplete={handleQuizComplete}
              onRetryQuiz={retryQuiz}
            />
          </div>
        </div>

        <div className="hidden lg:block">
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="mt-0 max-h-[min(600px,70vh)] overflow-y-auto rounded-xl border border-border bg-card p-4">
            <Panels
              key={mode}
              activeTab={activeTab}
              vocabulary={data.vocabulary}
              transcriptLines={transcriptLines}
              transcriptLoading={transcriptLoading}
              playbackSec={playbackSec}
              onSeek={seekToCue}
              isVideoComplete={isVideoComplete}
              quizQuestions={data.quizQuestions}
              quizResult={quizResult}
              onQuizComplete={handleQuizComplete}
              onRetryQuiz={retryQuiz}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
