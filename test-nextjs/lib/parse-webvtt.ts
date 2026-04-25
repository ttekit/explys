export type WebVttCue = {
  start: number;
  end: number;
  text: string;
};

/** Converts WebVTT timestamp to seconds (supports `hh:mm:ss.mmm` and `mm:ss.mmm`). */
function vttTimestampToSeconds(raw: string): number {
  const s = raw.trim();
  const parts = s.split(":");
  if (parts.length === 3) {
    const h = parseInt(parts[0]!, 10);
    const m = parseInt(parts[1]!, 10);
    const sec = parseFloat(parts[2]!);
    if (Number.isFinite(h) && Number.isFinite(m) && Number.isFinite(sec)) {
      return h * 3600 + m * 60 + sec;
    }
  }
  if (parts.length === 2) {
    const m = parseInt(parts[0]!, 10);
    const sec = parseFloat(parts[1]!);
    if (Number.isFinite(m) && Number.isFinite(sec)) {
      return m * 60 + sec;
    }
  }
  return 0;
}

/**
 * Minimal WebVTT cue list (sufficient for typical Deepgram / browser-style VTT).
 */
export function parseWebVtt(vtt: string): WebVttCue[] {
  const cues: WebVttCue[] = [];
  const lines = vtt.replace(/^\uFEFF/, "").split(/\r?\n/);
  let i = 0;
  if (lines[0]?.startsWith("WEBVTT")) {
    i = 1;
  }
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line === "" || line.startsWith("NOTE") || line.startsWith("STYLE")) {
      i += 1;
      continue;
    }
    const parts = line.split("-->");
    if (parts.length !== 2) {
      i += 1;
      continue;
    }
    const startRaw = parts[0]!.trim().split(/\s+/)[0] ?? "";
    const endRaw = parts[1]!.trim().split(/\s+/)[0] ?? "";
    if (!startRaw || !endRaw) {
      i += 1;
      continue;
    }
    const start = vttTimestampToSeconds(startRaw);
    const end = vttTimestampToSeconds(endRaw);
    i += 1;
    const textLines: string[] = [];
    while (i < lines.length && lines[i] !== "") {
      const tl = (lines[i] ?? "").replace(/<[^>]+>/g, "").trim();
      if (tl) textLines.push(tl);
      i += 1;
    }
    const text = textLines.join(" ").trim();
    if (text && end > start) {
      cues.push({ start, end, text });
    }
    i += 1;
  }
  return cues;
}

export function findActiveCue(
  cues: WebVttCue[],
  t: number,
): WebVttCue | undefined {
  return cues.find((c) => t >= c.start && t < c.end);
}
