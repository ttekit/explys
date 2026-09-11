import { useState, useCallback, useRef, useEffect } from "react";
import { demoLessons } from "../components/landing/demo-lesson/demoLessonData";
import type { DemoMode } from "../components/landing/demo-lesson/DemoHeader";
import type { VideoQuizCompleteSummary } from "../components/content-watch/VideoQuiz";
import type { TabId } from "../lib/lesson-utils";
import { splitLongTranscriptLines } from "../lib/lesson-utils";
import { parseWebVttTranscriptLines } from "../lib/parseWebVtt";
import type { TranscriptLine } from "../components/content-watch/defaultLessonSides";

const WATCHED_COMPLETED_RATIO = 0.75;

export function useDemoLesson(mode: DemoMode) {
  const data = demoLessons[mode];

  const [activeTab, setActiveTab] = useState<TabId>("vocabulary");
  const [playbackSec, setPlaybackSec] = useState(0);
  const [isVideoComplete, setIsVideoComplete] = useState(false);
  const [quizResult, setQuizResult] = useState<VideoQuizCompleteSummary | null>(
    null,
  );
  const [transcriptLines, setTranscriptLines] = useState<TranscriptLine[]>([]);
  const [transcriptLinesUk, setTranscriptLinesUk] = useState<TranscriptLine[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const progressedToWatchedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setTranscriptLoading(true);
    setTranscriptLines([]);
    setTranscriptLinesUk([]);
    
    Promise.all([
      fetch(data.subtitlesFileLink).then(r => r.text()),
      data.subtitlesFileLinkUk ? fetch(data.subtitlesFileLinkUk).then(r => r.text()) : Promise.resolve(null)
    ])
      .then(([enText, ukText]) => {
        if (cancelled) return;
        
        const enLines = splitLongTranscriptLines(
          parseWebVttTranscriptLines(enText),
          80,
        );
        const visibleEnLines = data.maxPlaybackSec
          ? enLines.filter(
              (line) => (line.startSec ?? 0) < data.maxPlaybackSec!,
            )
          : enLines;
        setTranscriptLines(visibleEnLines);

        if (ukText) {
          const ukLines = splitLongTranscriptLines(
            parseWebVttTranscriptLines(ukText),
            80,
          );
          const visibleUkLines = data.maxPlaybackSec
            ? ukLines.filter(
                (line) => (line.startSec ?? 0) < data.maxPlaybackSec!,
              )
            : ukLines;
          setTranscriptLinesUk(visibleUkLines);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTranscriptLines([]);
          setTranscriptLinesUk([]);
        }
      })
      .finally(() => {
        if (!cancelled) setTranscriptLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [data.subtitlesFileLink, data.subtitlesFileLinkUk, data.maxPlaybackSec]);

  const onVideoMount = useCallback((el: HTMLVideoElement | null) => {
    videoElRef.current = el;
  }, []);

  const seekToCue = useCallback(
    (seconds: number) => {
      const el = videoElRef.current;
      if (!el || !Number.isFinite(seconds)) return;
      const capped = data.maxPlaybackSec
        ? Math.min(seconds, data.maxPlaybackSec)
        : seconds;
      try {
        el.currentTime = Math.max(0, capped);
      } catch {}
    },
    [data.maxPlaybackSec],
  );

  const ensureComplete = useCallback(() => {
    if (progressedToWatchedRef.current) return;
    progressedToWatchedRef.current = true;
    setIsVideoComplete(true);
  }, []);

  const handlePlaybackTime = useCallback(
    (sec: number) => {
      setPlaybackSec(sec);
      if (data.maxPlaybackSec && sec >= data.maxPlaybackSec) {
        videoElRef.current?.pause();
        ensureComplete();
      }
    },
    [data.maxPlaybackSec, ensureComplete],
  );

  const handlePlaybackFraction = useCallback(
    (fraction: number) => {
      if (fraction >= WATCHED_COMPLETED_RATIO) {
        ensureComplete();
      }
    },
    [ensureComplete],
  );

  const handleVideoEnded = useCallback(() => {
    ensureComplete();
  }, [ensureComplete]);

  const handleQuizComplete = useCallback(
    (summary: VideoQuizCompleteSummary) => {
      setQuizResult(summary);
    },
    [],
  );

  const retryQuiz = useCallback(() => {
    setQuizResult(null);
  }, []);

  return {
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
  };
}
