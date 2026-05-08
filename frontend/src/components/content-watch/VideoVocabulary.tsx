import { useState } from "react";
import { ChevronDown, Volume2 } from "lucide-react";
import { cn } from "../../lib/utils";
import type { VocabularyItem } from "./defaultLessonSides";

interface VideoVocabularyProps {
  vocabulary: VocabularyItem[];
}

function grayHintLine(item: VocabularyItem): string {
  const parts = [item.translation?.trim(), item.pronunciation?.trim()].filter(
    (p): p is string => Boolean(p && p.length > 0),
  );
  if (parts.length === 0) return "";
  return parts.join(" · ");
}

export function VideoVocabulary({ vocabulary }: VideoVocabularyProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  if (vocabulary.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="mb-4 text-lg font-semibold text-foreground">
          Key vocabulary
        </h3>
        <p className="text-sm text-muted-foreground">
          No curated words yet — open this lesson after captions are generated, or sign in so we can personalize terms for your level.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="mb-4 text-lg font-semibold text-foreground">
        Key vocabulary
      </h3>

      {vocabulary.map((item, index) => {
        const gray = grayHintLine(item);
        const meaning = item.meaning?.trim() ?? "";

        return (
          <div key={index} className="overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              onClick={() =>
                setExpandedIndex(expandedIndex === index ? null : index)
              }
              className="flex w-full items-center justify-between p-3 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <span
                  className="rounded-full bg-primary/10 p-1.5 transition-colors hover:bg-primary/20"
                  aria-hidden
                >
                  <Volume2 className="h-4 w-4 text-primary" />
                </span>
                <span className="font-medium text-foreground">{item.word}</span>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  expandedIndex === index && "rotate-180",
                )}
              />
            </button>

            {expandedIndex === index ? (
              <div className="space-y-2 px-3 pb-3">
                <div className="pl-10">
                  <p className="text-sm text-muted-foreground">
                    {gray || "—"}
                  </p>
                  <div className="mt-2 rounded-lg bg-muted/50 p-2">
                    <p className="text-sm leading-relaxed text-foreground">
                      {meaning || "—"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
