/**
 * Strips WebVTT cue timestamps and structure; keeps spoken text for LLM input.
 */
export function webVttToPlainText(vtt: string): string {
  return vtt
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length === 0) return false;
      if (line === 'WEBVTT') return false;
      if (/^\d+$/.test(line)) return false; // optional cue id
      if (/-->/.test(line)) return false; // timing line
      if (/^NOTE($|\s)/i.test(line)) return false;
      if (/^STYLE$/i.test(line) || /^REGION$/i.test(line)) return false;
      return true;
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
