/**
 * Mirrors `knowledgeDelta` in the API (content-video-test-grade.util.ts).
 * Returns approximate point changes on the 0–100 mastery scale for display.
 */
export function estimatedLessonKnowledgeFromQuizPct(pctCorrect: number): {
  listening: number;
  vocabulary: number;
} {
  const pct01 = Math.max(0, Math.min(1, pctCorrect / 100));
  const d = 0.12 * (pct01 - 0.5);
  return {
    listening: Math.round(d * 0.55 * 100),
    vocabulary: Math.round(d * 0.45 * 100),
  };
}

/** Approximate listening points from server watch-complete bump (0–100 scale, rounded). */
export const WATCH_COMPLETE_LISTENING_POINTS = 3;