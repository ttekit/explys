import type { TranscriptLine } from "../components/content-watch/defaultLessonSides";

/** Only merge into a completed sentence if cues are almost flush (split caption). */
const MERGE_AFTER_SENTENCE_GAP_SEC = 0.48;
/** Typical same-speaker subtitle continuation (mid-sentence). */
const MERGE_MID_SENTENCE_GAP_SEC = 2.1;
/** Slightly longer pause only when previous line clearly isn’t complete. */
const MERGE_INCOMPLETE_GAP_SEC = 3.25;
/** Stop glueing one giant paragraph: max span of a merged cue (seconds). */
const MAX_MERGED_SPAN_SEC = 22;
/** …and max characters per transcript row. */
const MAX_MERGED_CHARS = 420;

/** Parses `HH:MM:SS.mmm`, `MM:SS.mmm`, single numbers, etc. */
export function parseVttTimestamp(ts: string): number {
  const t = ts.trim().split(/\s+/)[0]!;
  const parts = t.split(":");
  if (parts.length === 3) {
    const [h, m, sFrac] = parts;
    const s = Number.parseFloat(sFrac ?? "0");
    return Number(h) * 3600 + Number(m) * 60 + (Number.isFinite(s) ? s : 0);
  }
  if (parts.length === 2) {
    const [m, sFrac] = parts;
    const s = Number.parseFloat(sFrac ?? "0");
    return Number(m) * 60 + (Number.isFinite(s) ? s : 0);
  }
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

/** First line containing cue timing arrows. */
function timingLineIndex(lines: string[]): number {
  return lines.findIndex((ln) => /\d/.test(ln) && ln.includes("-->"));
}

/** Strip cue HTML; optional WebVTT voice `<v Speaker>`. */
function speakerAndPlainFromCue(raw: string): {
  speaker: string;
  plain: string;
} {
  let text = raw.replace(/\u200b/g, "").trim();

  const vMatch = text.match(/^<v[\s.]([^>]*)>\s*(.*?)\s*<\/v>/is);
  if (vMatch) {
    const sp = vMatch[1]?.trim().replace(/^\.+/, "") || "Lesson";
    const inner = stripVttCueHtml(vMatch[2] ?? "").replace(/\s+/g, " ").trim();
    return { speaker: sp || "Lesson", plain: inner };
  }

  text = stripVttCueHtml(text).replace(/\s+/g, " ").trim();
  const colon = text.match(/^([^:]{2,48}):\s*(.+)$/);
  if (colon) {
    return {
      speaker: colon[1]!.trim(),
      plain: colon[2]!.trim(),
    };
  }

  return { speaker: "Lesson", plain: text };
}

function stripVttCueHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractStartEndTokens(timingLine: string): [string, string] | null {
  const ix = timingLine.indexOf("-->");
  if (ix === -1) {
    return null;
  }
  const left = timingLine.slice(0, ix);
  const right = timingLine.slice(ix + 3);
  const re =
    /\b(?:\d{1,2}:)?\d{2}:\d{2}(?:\.\d{1,6})?\b/g;
  const startM = left.match(re);
  const endM = right.match(re);
  if (!startM?.[0] || !endM?.[0]) {
    return null;
  }
  return [startM[0], endM[0]];
}

/** Compact clock from seconds for the sidebar chip. */
function formatCueClock(sec: number): string {
  if (!Number.isFinite(sec)) return "—";
  const mm = Math.floor(sec / 60);
  const ss = Math.floor(sec % 60);
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (sec >= 3600) {
    const hh = Math.floor(sec / 3600);
    return `${hh}:${pad(mm % 60)}:${pad(ss)}`;
  }
  return `${mm}:${pad(ss)}`;
}

function endsWithSentenceTerminal(text: string): boolean {
  const t = text.trimEnd();
  if (!t) return false;
  return /[.!?…][\s"'')\]]*$/.test(t) || /[。．][\s"'')\]]*$/.test(t);
}

function wouldExceedMergedLimits(
  prev: TranscriptLine,
  next: TranscriptLine,
): boolean {
  const start = prev.startSec ?? 0;
  const nextEnd = next.endSec ?? next.startSec ?? start;
  if (nextEnd - start > MAX_MERGED_SPAN_SEC) return true;
  const combined =
    prev.text.replace(/\s+$/, "").length +
    next.text.replace(/^\s+/, "").length +
    1;
  return combined > MAX_MERGED_CHARS;
}

function shouldMergeTranscriptCues(
  prev: TranscriptLine,
  next: TranscriptLine,
): boolean {
  if (prev.speaker !== next.speaker) return false;
  if (wouldExceedMergedLimits(prev, next)) return false;

  const endPrev = prev.endSec ?? prev.startSec ?? 0;
  const startNext = next.startSec ?? 0;
  const gap = Math.max(0, startNext - endPrev);

  if (endsWithSentenceTerminal(prev.text)) {
    return gap <= MERGE_AFTER_SENTENCE_GAP_SEC;
  }
  if (gap <= MERGE_MID_SENTENCE_GAP_SEC) return true;
  if (gap <= MERGE_INCOMPLETE_GAP_SEC && !endsWithSentenceTerminal(prev.text)) {
    return true;
  }
  return false;
}

/**
 * Joins consecutive WebVTT cues from the same speaker into one row (full sentences, fewer chips).
 */
export function mergeAdjacentTranscriptLines(
  lines: TranscriptLine[],
): TranscriptLine[] {
  if (lines.length <= 1) return lines;
  const out: TranscriptLine[] = [];
  for (const line of lines) {
    const prev = out[out.length - 1];
    if (prev && shouldMergeTranscriptCues(prev, line)) {
      prev.text =
        `${prev.text.replace(/\s+$/, "")} ${line.text.replace(/^\s+/, "")}`.replace(
          /\s+/g,
          " ",
        ).trim();
      prev.endSec =
        line.endSec != null ?
          Math.max(line.endSec, prev.endSec ?? line.endSec)
        : prev.endSec;
    } else {
      out.push({ ...line });
    }
  }
  return out;
}

/**
 * Parses WebVTT → sidebar transcript cues ordered by `startSec`
 * (`startSec` / `endSec` track the embedded player timeline).
 */
export function parseWebVttTranscriptLines(vttRaw: string): TranscriptLine[] {
  const vtt = vttRaw.replace(/^\ufeff/, "").replace(/\r\n/g, "\n");
  const blocks = vtt.split(/\n\s*\n+/);
  const out: TranscriptLine[] = [];

  for (const blockRaw of blocks) {
    const lines = blockRaw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) {
      continue;
    }
    const head = lines[0]!;
    if (head.startsWith("WEBVTT")) {
      continue;
    }
    if (head.startsWith("NOTE") || head.startsWith("STYLE")) {
      continue;
    }

    let idx = timingLineIndex(lines);
    if (idx === -1) {
      continue;
    }

    let timingLn = lines[idx]!;
    if (!timingLn.includes("-->")) {
      idx += 1;
      timingLn = lines[idx];
    }
    if (!timingLn?.includes("-->")) {
      continue;
    }

    const pair = extractStartEndTokens(timingLn);
    if (!pair) {
      continue;
    }

    let startSec = parseVttTimestamp(pair[0]!);
    let endSec = parseVttTimestamp(pair[1]!);

    const bodyLines = lines.slice(idx + 1);
    const body = bodyLines.join("\n").trim();
    if (!body.length) {
      continue;
    }

    const { speaker, plain } = speakerAndPlainFromCue(body);
    if (!plain.length) {
      continue;
    }
    if (endSec <= startSec) {
      endSec = startSec + 1.25;
    }

    out.push({
      time: formatCueClock(startSec),
      speaker,
      text: plain,
      startSec,
      endSec,
    });
  }

  out.sort((a, b) => (a.startSec ?? 0) - (b.startSec ?? 0));
  return mergeAdjacentTranscriptLines(out);
}
