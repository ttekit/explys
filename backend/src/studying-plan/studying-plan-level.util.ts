export type CoarseLevelTier =
  | "beginner"
  | "elementary"
  | "intermediate"
  | "advanced";

/**
 * Coarse bucket from CEFR-ish profile text (registration / placement).
 */
export function coarseLevelTier(englishLevel: string): CoarseLevelTier {
  const s = englishLevel.toLowerCase();
  if (
    /c2|\bproficiency\b|\bproficient\b|\bmastery\b|\bnative\b/.test(s)
  ) {
    return "advanced";
  }
  if (/c1/.test(s)) return "advanced";
  if (/b2|upper.intermediate|upper-intermediate|vantage/.test(s)) {
    return "intermediate";
  }
  if (/b1|threshold|intermediate(?!\s*plus)/.test(s)) {
    return "intermediate";
  }
  if (/a2|elementary|pre-intermediate|preintermediate/.test(s)) {
    return "elementary";
  }
  if (/a1|beginner|starter|basic/.test(s)) return "beginner";
  return "beginner";
}

const VOCAB_BY_TIER: Record<CoarseLevelTier, [number, number, number, number]> =
  {
    beginner: [15, 22, 30, 40],
    elementary: [20, 30, 45, 60],
    intermediate: [28, 40, 55, 75],
    advanced: [35, 50, 70, 90],
  };

export function vocabularyTargetForPhase(
  tier: CoarseLevelTier,
  phaseIndex: number,
): number {
  return VOCAB_BY_TIER[tier][Math.min(3, Math.max(0, phaseIndex))];
}

/**
 * Daily-streak goal (consecutive days with meaningful practice) for the phase.
 */
export function streakTargetForPhase(
  phaseIndex: number,
  structuredStudyWeeks: number,
): number {
  const relaxed = structuredStudyWeeks < 6;
  const caps = relaxed ? [5, 6, 7, 7] : [7, 10, 14, 21];
  return caps[Math.min(3, Math.max(0, phaseIndex))];
}

/** Catalog videos passed at ≥70% (plan target; app still advances phase on 2 distinct). */
export function videosPassedPlanTargetForPhase(phaseIndex: number): number {
  return Math.max(3, 2 + phaseIndex * 2);
}
