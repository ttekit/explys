/** CEFR band from placement score — same thresholds as the placement-test iframe UI. */

import type { PlacementStoredDraftQuestion } from "./placement-draft.types";

export type PlacementLevelBand = {
  code: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  label: string;
};

/** Monotonic CEFR ladder for clamping placement outcomes to the learner’s declared band. */
export const PLACEMENT_CEFR_ORDER = [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const;

export type PlacementCefrCode = (typeof PLACEMENT_CEFR_ORDER)[number];

const PLACEMENT_BAND_LABELS: Record<PlacementCefrCode, string> = {
  A1: "Beginner",
  A2: "Elementary",
  B1: "Intermediate",
  B2: "Upper intermediate",
  C1: "Advanced",
  C2: "Proficient",
};

export function placementBandAtIndex(index: number): PlacementLevelBand {
  const idx = Math.min(
    PLACEMENT_CEFR_ORDER.length - 1,
    Math.max(0, Math.round(index)),
  );
  const code = PLACEMENT_CEFR_ORDER[idx];
  return { code, label: PLACEMENT_BAND_LABELS[code] };
}

export function indexOfPlacementCefrCode(
  code: PlacementLevelBand["code"],
): number {
  return PLACEMENT_CEFR_ORDER.indexOf(code as PlacementCefrCode);
}

/**
 * Entry test is confirmation-focused: questions target the learner’s declared band,
 * and we never promote above it from test scores alone. If performance is weaker,
 * we allow at most **one** CEFR step below the declared band (never more).
 */
export function confirmedPlacementBandFromDeclaredAndScore(
  scored: PlacementLevelBand,
  declared: PlacementLevelBand,
): PlacementLevelBand {
  const si = indexOfPlacementCefrCode(scored.code);
  const di = indexOfPlacementCefrCode(declared.code);
  if (si < 0 || di < 0) {
    return declared;
  }
  if (si >= di) {
    return declared;
  }
  const minAllowedIdx = Math.max(0, di - 1);
  const finalIdx = Math.max(si, minAllowedIdx);
  return placementBandAtIndex(finalIdx);
}

/** `englishLevel` string stored without label (Algorythm `getBaseLevel` expects "A1"…"C2"). */
export function placementBandFromScore(
  score: number,
  total: number,
): PlacementLevelBand {
  if (total <= 0) {
    return { code: "B1", label: "Intermediate" };
  }
  const pct = (score / total) * 100;
  if (pct >= 90) return { code: "C1", label: "Advanced" };
  if (pct >= 70) return { code: "B2", label: "Upper intermediate" };
  if (pct >= 50) return { code: "B1", label: "Intermediate" };
  if (pct >= 30) return { code: "A2", label: "Elementary" };
  return { code: "A1", label: "Beginner" };
}

export function scoreAgainstDraft(
  draftRows: readonly { id: string; correctIndex: 0 | 1 | 2 | 3 }[],
  answers: Record<string, number>,
): { score: number; total: number } {
  let score = 0;
  const total = draftRows.length;
  for (const row of draftRows) {
    const pick = answers[row.id];
    if (pick === row.correctIndex) score++;
  }
  return { score, total };
}

/** Per-skill correctness for drafts that store `type` on each question. */
export function scorePlacementBySkill(
  draftRows: readonly PlacementStoredDraftQuestion[],
  answers: Record<string, number>,
): {
  grammar: { c: number; t: number };
  vocabulary: { c: number; t: number };
  untyped: { c: number; t: number };
} {
  let gC = 0,
    gT = 0,
    vC = 0,
    vT = 0,
    uC = 0,
    uT = 0;
  for (const row of draftRows) {
    const pick = answers[row.id];
    const ok = typeof pick === "number" && pick === row.correctIndex;
    if (row.type === "grammar") {
      gT++;
      if (ok) {
        gC++;
      }
    } else if (row.type === "vocabulary") {
      vT++;
      if (ok) {
        vC++;
      }
    } else {
      uT++;
      if (ok) {
        uC++;
      }
    }
  }
  return {
    grammar: { c: gC, t: gT },
    vocabulary: { c: vC, t: vT },
    untyped: { c: uC, t: uT },
  };
}

/** Best-effort parse of already-persisted `englishLevel` (self-report or prior completion). */
export function inferPlacementBandFromProfile(
  raw: string | null | undefined,
): PlacementLevelBand {
  const head = String(raw ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 8);

  const m = head.match(/^(A1|A2|B1|B2|C1|C2)\b/)?.[1];
  if (!m || m === "CHOOSE" || m === "UNKNOWN") {
    return { code: "B1", label: "Intermediate" };
  }
  switch (m) {
    case "A1":
      return { code: "A1", label: "Beginner" };
    case "A2":
      return { code: "A2", label: "Elementary" };
    case "B1":
      return { code: "B1", label: "Intermediate" };
    case "B2":
      return { code: "B2", label: "Upper intermediate" };
    case "C1":
      return { code: "C1", label: "Advanced" };
    default:
      return { code: "C2", label: "Proficient" };
  }
}
