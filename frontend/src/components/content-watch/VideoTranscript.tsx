import { cn } from "../../lib/utils";
import type { TranscriptLine } from "./defaultLessonSides";

interface VideoTranscriptProps {
  transcript: TranscriptLine[];
}

const speakerColors: Record<string, string> = {
  Host: "text-primary",
  Guide: "text-accent",
};

export function VideoTranscript({ transcript }: VideoTranscriptProps) {
  return (
    <div className="space-y-4">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Transcript</h3>

      <div className="space-y-3">
        {transcript.map((line, index) => (
          <div
            key={index}
            className="group flex cursor-pointer gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
          >
            <span className="shrink-0 pt-0.5 font-mono text-xs text-muted-foreground">
              {line.time}
            </span>
            <div>
              <span
                className={cn(
                  "text-sm font-medium",
                  speakerColors[line.speaker] ?? "text-foreground",
                )}
              >
                {line.speaker}:
              </span>
              <p className="text-sm leading-relaxed text-foreground">
                {line.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="pt-4 text-center text-xs text-muted-foreground">
        Tip: follow along aloud to mimic rhythm and tone.
      </p>
    </div>
  );
}
