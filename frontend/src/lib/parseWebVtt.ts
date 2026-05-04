import type { TranscriptLine } from "../components/content-watch/defaultLessonSides";

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
  return out;
}
