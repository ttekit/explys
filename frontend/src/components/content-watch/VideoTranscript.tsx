import { useEffect, useMemo, useRef } from "react";
import { cn } from "../../lib/utils";
import type { TranscriptLine } from "./defaultLessonSides";

interface VideoTranscriptProps {
  transcript: TranscriptLine[];
  /** Loads `.vtt` from the lesson API before rows appear. */
  loading?: boolean;
  /** Playback head in seconds — highlights the matching cue when cues have timings. */
  playbackSec?: number;
  /** Click a cue to jump the lesson player to this subtitle time. */
  onSeek?: (seconds: number) => void;
}

const speakerColors: Record<string, string> = {
  Host: "text-primary",
  Guide: "text-accent",
  Lesson: "text-foreground",
};

function activeCueIndex(
  transcript: TranscriptLine[],
  t: number | undefined,
): number {
  if (t === undefined || !Number.isFinite(t) || transcript.length === 0) {
    return -1;
  }
  for (let i = 0; i < transcript.length; i++) {
    const s = transcript[i]!.startSec;
    const e = transcript[i]!.endSec;
    if (s == null || e == null) {
      continue;
    }
    if (t >= s && t < e) {
      return i;
    }
  }
  return -1;
}

export function VideoTranscript({
  transcript,
  loading,
  playbackSec,
  onSeek,
}: VideoTranscriptProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const activeIndex = useMemo(
    () => activeCueIndex(transcript, playbackSec),
    [transcript, playbackSec],
  );

  useEffect(() => {
    if (activeIndex < 0 || loading) return;
    const root = listRef.current;
    if (!root) return;
    const el = root.querySelector(`[data-cue-index="${activeIndex}"]`);
    el?.scrollIntoView({
      behavior: "smooth",
      block: "center",
      inline: "nearest",
    });
  }, [activeIndex, loading]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Transcript</h3>
        <p className="text-center text-sm text-muted-foreground">
          Loading captions…
        </p>
      </div>
    );
  }

  if (transcript.length === 0) {
    return (
      <div className="space-y-4">
        <h3 className="mb-4 text-lg font-semibold text-foreground">Transcript</h3>
        <p className="text-sm text-muted-foreground">
          Captions will appear here after this lesson has WebVTT generated on the server.
        </p>
      </div>
    );
  }

  const seeks = typeof onSeek === "function";

  return (
    <div className="space-y-4">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Transcript</h3>

      <div ref={listRef} className="space-y-2">
        {transcript.map((line, index) => {
          const canSeek = seeks && typeof line.startSec === "number";
          const highlighted = activeIndex === index;
          return (
            <button
              key={`${index}-${line.time}-${line.text.slice(0, 24)}`}
              type="button"
              data-cue-index={index}
              disabled={!canSeek}
              title={canSeek ? "Seek to this line" : undefined}
              onClick={() => canSeek && onSeek!(line.startSec!)}
              className={cn(
                "flex w-full cursor-default gap-3 rounded-lg p-2 text-left transition-colors",
                canSeek && "cursor-pointer hover:bg-muted/50",
                highlighted && "bg-primary/15 ring-2 ring-primary/25",
              )}
            >
              <span className="shrink-0 pt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                {line.time}
              </span>
              <div className="min-w-0">
                <span className={cn(
                    "text-sm font-medium",
                    speakerColors[line.speaker] ??
                      speakerColors.Lesson ??
                      "text-foreground",
                  )}>
                  {line.speaker}:
                </span>
                <p className="text-sm leading-relaxed text-foreground">
                  {line.text}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {(onSeek !== undefined &&
        transcript.some((l) => typeof l.startSec === "number")) ?
        (
          <p className="pt-4 text-center text-xs text-muted-foreground">
            The highlighted line follows playback. Tap a cue to jump in the clip.
          </p>
        )
      : (
        <p className="pt-4 text-center text-xs text-muted-foreground">
          Tip: follow along aloud to mimic rhythm and tone.
        </p>
      )}
    </div>
  );
}
