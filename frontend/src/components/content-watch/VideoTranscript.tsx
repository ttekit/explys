import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "../../lib/utils";
import type { TranscriptLine, VocabularyItem } from "./defaultLessonSides";
import { useLandingLocale } from "../../context/LandingLocaleContext";

interface VideoTranscriptProps {
  transcript: TranscriptLine[];
  /** Loads `.vtt` from the lesson API before rows appear. */
  loading?: boolean;
  /** Playback head in seconds — highlights the matching cue when cues have timings. */
  playbackSec?: number;
  /** Click a cue to jump the lesson player to this subtitle time. */
  onSeek?: (seconds: number) => void;
  /** Key vocabulary rows — terms are highlighted; tap opens translation / meaning. */
  highlightVocabulary?: VocabularyItem[];
}

type TranscriptGlossPopup = {
  term: string;
  translation?: string;
  meaning: string;
  left: number;
  top: number;
};

function isWordCharUnicode(ch: string): boolean {
  return /[\p{L}\p{N}]/u.test(ch);
}

function buildHighlightData(vocabulary: readonly VocabularyItem[]): {
  terms: string[];
  glossByLower: Map<string, VocabularyItem>;
} {
  const seen = new Set<string>();
  const items: VocabularyItem[] = [];
  for (const v of vocabulary) {
    const w = v.word?.trim();
    if (!w || w.length < 2 || w.length > 96) continue;
    const k = w.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    items.push(v);
    if (items.length >= 64) break;
  }
  const terms = items.map((v) => v.word.trim());
  const glossByLower = new Map<string, VocabularyItem>();
  for (const v of items) {
    glossByLower.set(v.word.trim().toLowerCase(), v);
  }
  return { terms, glossByLower };
}

function resolveGloss(
  slice: string,
  glossByLower: Map<string, VocabularyItem>,
): VocabularyItem | null {
  const k = slice.trim().toLowerCase();
  const direct = glossByLower.get(k);
  if (direct) return direct;
  const norm = k.replace(/\s+/g, " ");
  for (const v of glossByLower.values()) {
    const vk = v.word.trim().toLowerCase().replace(/\s+/g, " ");
    if (vk === norm) return v;
  }
  return null;
}

/**
 * Finds non-overlapping spans of `text` that match studying terms (longest terms first).
 */
function studyingTermRanges(
  text: string,
  terms: readonly string[],
): Array<{ start: number; end: number }> {
  const normalized = [...terms]
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && t.length <= 96);
  const seenLower = new Set<string>();
  const uniqueLongestFirst: string[] = [];
  for (const t of [...normalized].sort((a, b) => b.length - a.length)) {
    const k = t.toLowerCase();
    if (seenLower.has(k)) continue;
    seenLower.add(k);
    uniqueLongestFirst.push(t);
  }
  const lowerText = text.toLowerCase();
  const ranges: Array<{ start: number; end: number }> = [];
  for (const term of uniqueLongestFirst) {
    const lowerTerm = term.toLowerCase();
    let i = 0;
    while (i <= text.length - term.length) {
      const idx = lowerText.indexOf(lowerTerm, i);
      if (idx < 0) break;
      const end = idx + term.length;
      const before = idx > 0 ? text[idx - 1]! : "";
      const after = end < text.length ? text[end]! : "";
      if (
        (idx > 0 && isWordCharUnicode(before)) ||
        (end < text.length && isWordCharUnicode(after))
      ) {
        i = idx + 1;
        continue;
      }
      ranges.push({ start: idx, end });
      i = idx + term.length;
    }
  }
  if (ranges.length === 0) return [];
  ranges.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  let cur = { ...ranges[0]! };
  for (let r = 1; r < ranges.length; r++) {
    const next = ranges[r]!;
    if (next.start <= cur.end) {
      cur.end = Math.max(cur.end, next.end);
    } else {
      merged.push(cur);
      cur = { ...next };
    }
  }
  merged.push(cur);
  return merged;
}

function renderLineWithHighlights(
  text: string,
  ranges: Array<{ start: number; end: number }>,
  glossByLower: Map<string, VocabularyItem>,
  markInteractiveTitle: string,
  onMarkPointerDown: (args: { slice: string; target: HTMLElement }) => void,
): ReactNode {
  if (ranges.length === 0) {
    return text;
  }
  const parts: ReactNode[] = [];
  let pos = 0;
  for (let u = 0; u < ranges.length; u++) {
    const r = ranges[u]!;
    if (r.start > pos) {
      parts.push(text.slice(pos, r.start));
    }
    const slice = text.slice(r.start, r.end);
    const hasGloss = resolveGloss(slice, glossByLower) != null;
    parts.push(
      <mark
        key={`h-${r.start}-${r.end}-${u}`}
        data-vocab-mark="1"
        role={hasGloss ? "button" : undefined}
        tabIndex={hasGloss ? 0 : undefined}
        aria-label={hasGloss ? `${markInteractiveTitle}: ${slice}` : undefined}
        className={cn(
          "rounded px-0.5 font-medium text-foreground",
          hasGloss ?
            "cursor-pointer bg-amber-400/35 underline decoration-amber-700/40 decoration-dotted underline-offset-2 hover:bg-amber-400/50 dark:bg-amber-500/30 dark:hover:bg-amber-500/45"
          : "bg-amber-400/35 dark:bg-amber-500/30",
        )}
        title={hasGloss ? markInteractiveTitle : undefined}
        onPointerDown={(e) => {
          if (!hasGloss) return;
          e.preventDefault();
          e.stopPropagation();
          onMarkPointerDown({
            slice,
            target: e.currentTarget,
          });
        }}
        onKeyDown={(e) => {
          if (!hasGloss) return;
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          e.stopPropagation();
          onMarkPointerDown({
            slice,
            target: e.currentTarget,
          });
        }}
      >
        {slice}
      </mark>,
    );
    pos = r.end;
  }
  if (pos < text.length) {
    parts.push(text.slice(pos));
  }
  return <>{parts}</>;
}

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

const POPOVER_W = 280;
const POPOVER_PAD = 8;

function positionPopover(anchor: HTMLElement): { left: number; top: number } {
  const rect = anchor.getBoundingClientRect();
  let left = rect.left;
  let top = rect.bottom + 6;
  const maxLeft = window.innerWidth - POPOVER_W - POPOVER_PAD;
  if (left > maxLeft) left = Math.max(POPOVER_PAD, maxLeft);
  if (left < POPOVER_PAD) left = POPOVER_PAD;
  const estH = 120;
  if (top + estH > window.innerHeight - POPOVER_PAD) {
    top = Math.max(POPOVER_PAD, rect.top - estH - 6);
  }
  return { left, top };
}

export function VideoTranscript({
  transcript,
  loading,
  playbackSec,
  onSeek,
  highlightVocabulary = [],
}: VideoTranscriptProps) {
  const { messages } = useLandingLocale();
  const listRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [glossPopup, setGlossPopup] = useState<TranscriptGlossPopup | null>(
    null,
  );

  const { terms: termsForHighlight, glossByLower } = useMemo(
    () => buildHighlightData(highlightVocabulary),
    [highlightVocabulary],
  );

  const activeIndex = useMemo(
    () => activeCueIndex(transcript, playbackSec),
    [transcript, playbackSec],
  );

  const openGloss = useCallback(
    (args: { slice: string; target: HTMLElement }) => {
      const row = resolveGloss(args.slice, glossByLower);
      if (!row) return;
      const tr = row.translation?.trim();
      const meaning = row.meaning?.trim() ?? "";
      const { left, top } = positionPopover(args.target);
      setGlossPopup({
        term: row.word.trim(),
        translation: tr && tr.length > 0 ? tr : undefined,
        meaning: meaning.length > 0 ? meaning : "—",
        left,
        top,
      });
    },
    [glossByLower],
  );

  useEffect(() => {
    if (!glossPopup) return;
    const onDocPointer = (e: PointerEvent) => {
      const pop = popoverRef.current;
      if (pop?.contains(e.target as Node)) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("[data-vocab-mark='1']")) return;
      setGlossPopup(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setGlossPopup(null);
    };
    const id = window.setTimeout(() => {
      document.addEventListener("pointerdown", onDocPointer);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [glossPopup]);

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
  const L = messages.lesson;

  return (
    <div className="relative space-y-4">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Transcript</h3>

      {glossPopup ?
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={glossPopup.term}
          className="fixed z-[80] w-[min(280px,calc(100vw-1rem))] rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg"
          style={{ left: glossPopup.left, top: glossPopup.top }}
        >
          <p className="font-semibold text-foreground">{glossPopup.term}</p>
          {glossPopup.translation ?
            <p className="mt-2 text-sm">
              <span className="text-muted-foreground">
                {L.transcriptVocabTranslationLabel}:{" "}
              </span>
              <span className="text-foreground">{glossPopup.translation}</span>
            </p>
          : null}
          <p className="mt-2 text-sm">
            <span className="text-muted-foreground">
              {L.transcriptVocabMeaningLabel}:{" "}
            </span>
            <span className="text-foreground">{glossPopup.meaning}</span>
          </p>
        </div>
      : null}

      <div ref={listRef} className="space-y-2">
        {transcript.map((line, index) => {
          const canSeek = seeks && typeof line.startSec === "number";
          const highlighted = activeIndex === index;
          const vocabRanges =
            termsForHighlight.length > 0 ?
              studyingTermRanges(line.text, termsForHighlight)
            : [];
          return (
            <div
              key={`${index}-${line.time}-${line.text.slice(0, 24)}`}
              data-cue-index={index}
              role={canSeek ? "button" : undefined}
              tabIndex={canSeek ? 0 : undefined}
              title={canSeek ? "Seek to this line" : undefined}
              onClick={(e) => {
                if (!canSeek) return;
                if (
                  (e.target as HTMLElement).closest("[data-vocab-mark='1']")
                ) {
                  return;
                }
                onSeek!(line.startSec!);
              }}
              onKeyDown={(e) => {
                if (!canSeek) return;
                if (e.key !== "Enter" && e.key !== " ") return;
                if (
                  (e.target as HTMLElement).closest("[data-vocab-mark='1']")
                ) {
                  return;
                }
                e.preventDefault();
                onSeek!(line.startSec!);
              }}
              className={cn(
                "flex w-full cursor-default gap-3 rounded-lg p-2 text-left transition-colors",
                canSeek && "cursor-pointer hover:bg-muted/50",
                !canSeek && "cursor-default",
                highlighted && "bg-primary/15 ring-2 ring-primary/25",
              )}
            >
              <span className="shrink-0 pt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                {line.time}
              </span>
              <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
                {renderLineWithHighlights(
                  line.text,
                  vocabRanges,
                  glossByLower,
                  L.transcriptVocabMarkTitle,
                  openGloss,
                )}
              </p>
            </div>
          );
        })}
      </div>

      {termsForHighlight.length > 0 ?
        <p className="text-center text-xs text-muted-foreground">
          {L.transcriptVocabHighlightHint}
        </p>
      : null}
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
