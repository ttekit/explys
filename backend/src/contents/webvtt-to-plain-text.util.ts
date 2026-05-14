/**
 * Extracts spoken cue text from WebVTT for LLM input (tests, vocabulary, tags).
 *
 * Only text lines that belong to cues (immediately after a `timestamp --> timestamp`
 * line) are kept. This drops the file header, including Deepgram’s `NOTE` block
 * (“Transcription provided by Deepgram”, request id, duration, channels, etc.).
 */
export function webVttToPlainText(vtt: string): string {
  const lines = vtt.replace(/\r\n/g, "\n").split("\n");
  const parts: string[] = [];
  let inCuePayload = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      inCuePayload = false;
      continue;
    }
    if (/-->/.test(line)) {
      inCuePayload = true;
      continue;
    }
    if (!inCuePayload) {
      continue;
    }
    let text = line.replace(/^<v[^>]*>\s*/i, "").replace(/<\/v>\s*/gi, "");
    text = text.replace(/<[^>]{1,120}>/g, "");
    if (text.length > 0) {
      parts.push(text);
    }
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}
