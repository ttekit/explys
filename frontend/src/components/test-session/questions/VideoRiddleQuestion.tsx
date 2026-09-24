import { useCallback, useEffect, useRef, useState } from "react";
import { Film, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { cn } from "../../../lib/utils";
import { apiFetch } from "../../../lib/api";
import type { VideoRiddleQuestion as VideoRiddleQuestionType } from "../test-session.types";
import { get_answer_option_classes } from "./answer-option-styles.util";
import type { QuestionComponentProps } from "./question-component.types";

export function VideoRiddleQuestion({
  question,
  disabled,
  onAnswer,
}: QuestionComponentProps<VideoRiddleQuestionType>) {
  const [selected, setSelected] = useState<string | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startTime = question.segment?.startTimeSec ?? 0;
  const endTime = question.segment?.endTimeSec;

  const isInteractionLocked = disabled || Boolean(selected);

  useEffect(() => {
    let cancelled = false;
    const contentVideoId = question.segment?.contentVideoId;
    if (!contentVideoId) {
      return;
    }

    void (async () => {
      try {
        const res = await apiFetch(`/content-video/${contentVideoId}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data?.videoLink && !cancelled) {
          setVideoSrc(data.videoLink);
        }
      } catch (err) {
        // Video load fallback - question remains playable
        console.warn("Could not load video link for riddle segment", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [question.segment?.contentVideoId]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (endTime && video.currentTime >= endTime) {
      video.currentTime = startTime;
      void video.play().catch(() => {});
    }
  }, [endTime, startTime]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      void video.play();
      setIsPlaying(true);
    }
  };

  const handleRestart = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = startTime;
    void video.play();
    setIsPlaying(true);
  };

  const handle_select = (option: string): void => {
    if (isInteractionLocked) {
      return;
    }
    setSelected(option);
    onAnswer({
      isCorrect: option === question.correctAnswer,
      userAnswer: option,
    });
  };

  return (
    <div className="flex min-h-full flex-col px-4 py-4 sm:py-6">
      {/* Badge header */}
      <div className="mb-4 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-purple-300">
          <Film className="h-3.5 w-3.5 text-purple-400" />
          Відео-фрагмент
        </span>
        {videoSrc && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestart}
              className="rounded-lg bg-white/5 p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white"
              title="Перезапустити фрагмент"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsMuted((prev) => !prev)}
              className="rounded-lg bg-white/5 p-1.5 text-muted-foreground hover:bg-white/10 hover:text-white"
              title={isMuted ? "Увімкнути звук" : "Вимкнути звук"}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Video clip player */}
      {videoSrc ? (
        <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-lg">
          <video
            ref={videoRef}
            src={videoSrc}
            playsInline
            muted={isMuted}
            autoPlay
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                videoRef.current.currentTime = startTime;
                void videoRef.current.play().catch(() => {});
              }
            }}
            onClick={togglePlay}
            className="h-full w-full object-cover cursor-pointer"
          />
          {!isPlaying && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/40 text-white"
            >
              <Play className="h-12 w-12 fill-white" />
            </button>
          )}
        </div>
      ) : null}

      {/* Subtitle with blank prompt */}
      <div className="mb-6 rounded-2xl border border-purple-500/20 bg-card/40 p-4 text-center sm:p-6 backdrop-blur-sm">
        <p className="text-xs uppercase tracking-wider text-purple-400 mb-2 font-medium">
          Заповніть пропуск за відео:
        </p>
        <p className="text-lg font-medium leading-relaxed text-foreground sm:text-xl">
          {question.subtitleWithBlank}
        </p>
      </div>

      {/* 4 Answer options */}
      <div className="mt-auto grid grid-cols-1 gap-3 sm:grid-cols-2">
        {question.options.map((option) => (
          <button
            key={option}
            type="button"
            aria-disabled={isInteractionLocked}
            onClick={() => handle_select(option)}
            className={cn(
              "w-full rounded-2xl border-2 px-4 py-4 text-left text-lg font-semibold transition-all duration-200",
              get_answer_option_classes({
                option,
                selected,
                correctAnswer: question.correctAnswer,
              }),
              isInteractionLocked && "pointer-events-none",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
