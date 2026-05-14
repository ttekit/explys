/**
 * Free-text time horizons (e.g. "6 months", "1 year") → approximate days/weeks
 * so plans can target ~90% of the learner’s stated timeline across four phases.
 */

const DEFAULT_HORIZON_DAYS = 365;
/** Fraction of the stated horizon the phased roadmap should structurally cover. */
export const STRUCTURED_STUDY_FRACTION = 0.9;

export type HorizonBudget = {
  /** Best-effort parse of the user’s phrase. */
  approxTotalDays: number;
  /** ~90% of `approxTotalDays` (≥ 1 day). */
  structuredStudyDays: number;
  approxTotalWeeks: number;
  structuredStudyWeeks: number;
  /**
   * Minimum days to budget per phase (4 slots; sums to `structuredStudyDays`).
   * Used in copy so phases don’t collapse to “few days” when the horizon is long.
   */
  phaseMinDays: [number, number, number, number];
  /**
   * Derived weeks per phase (≥1 each when days allow) for prompts / UI-style wording.
   */
  phaseMinWeeks: [number, number, number, number];
};

function roundWeeksFromDays(days: number): number {
  return Math.max(1, Math.round(days / 7));
}

/**
 * Parses common English phrases and short forms. Unknown text defaults to ~1 year.
 */
export function approximateHorizonDays(label: string): number {
  const raw = label.trim().toLowerCase().replace(/\s+/g, " ");
  if (!raw) return DEFAULT_HORIZON_DAYS;

  const halfYear =
    /\bhalf\s*a\s*year\b/.test(raw) ||
    /\b6\s*months\b/.test(raw) ||
    /\bsix\s*months\b/.test(raw);
  if (halfYear) return 183;

  const numMatch = raw.match(/(\d+(?:\.\d+)?)/);
  const n = numMatch ? Math.max(0.25, parseFloat(numMatch[1])) : 1;

  if (/\byears?\b|\byrs?\b/.test(raw)) return Math.round(n * 365);
  if (/\bmonths?\b|\bmos?\b/.test(raw)) return Math.round(n * 30.44);
  if (/\bweeks?\b|\bwks?\b/.test(raw)) return Math.round(n * 7);
  if (/\bdays?\b/.test(raw)) return Math.round(n);

  // Compact: "1y", "18m"
  if (/^\d+(\.\d+)?\s*y$/.test(raw)) return Math.round(n * 365);
  if (/^\d+(\.\d+)?\s*m$/.test(raw)) return Math.round(n * 30.44);
  if (/^\d+(\.\d+)?\s*w$/.test(raw)) return Math.round(n * 7);

  if (/\bquarter\b/.test(raw)) return 91;
  if (/\bdecade\b/.test(raw)) return 3650;

  return DEFAULT_HORIZON_DAYS;
}

function splitStructuredDaysAcrossPhases(
  n: number,
): [number, number, number, number] {
  if (n <= 0) return [1, 1, 1, 1];
  if (n < 4) {
    const out: [number, number, number, number] = [0, 0, 0, 0];
    for (let i = 0; i < n; i++) out[i] = 1;
    return out;
  }
  const w: [number, number, number, number] = [0.22, 0.24, 0.26, 0.28];
  const floors = w.map((wi) => Math.floor(n * wi));
  let assigned = floors.reduce((a, b) => a + b, 0);
  let rem = n - assigned;
  const out = [...floors] as [number, number, number, number];
  for (let i = 3; i >= 0 && rem > 0; i--) {
    out[i] += 1;
    rem -= 1;
  }
  return out;
}

function phaseWeeksFromDays(days: number): number {
  if (days <= 0) return 1;
  if (days < 10) return 1;
  return Math.max(1, Math.round(days / 7));
}

export function horizonBudgetFromLabel(label: string): HorizonBudget {
  const approxTotalDays = Math.max(1, approximateHorizonDays(label));
  const structuredStudyDays = Math.max(
    1,
    Math.round(approxTotalDays * STRUCTURED_STUDY_FRACTION),
  );
  const approxTotalWeeks = roundWeeksFromDays(approxTotalDays);
  const structuredStudyWeeks = roundWeeksFromDays(structuredStudyDays);

  const phaseMinDays = splitStructuredDaysAcrossPhases(structuredStudyDays);
  const phaseMinWeeks: [number, number, number, number] = [
    phaseWeeksFromDays(phaseMinDays[0]),
    phaseWeeksFromDays(phaseMinDays[1]),
    phaseWeeksFromDays(phaseMinDays[2]),
    phaseWeeksFromDays(phaseMinDays[3]),
  ];

  return {
    approxTotalDays,
    structuredStudyDays,
    approxTotalWeeks,
    structuredStudyWeeks,
    phaseMinDays,
    phaseMinWeeks,
  };
}
