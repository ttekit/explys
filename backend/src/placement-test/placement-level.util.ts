/** CEFR band from placement score — same thresholds as the placement-test iframe UI. */

export type PlacementLevelBand = {
  code: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  label: string;
};

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
