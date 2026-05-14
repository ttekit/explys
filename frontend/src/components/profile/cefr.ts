const ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

/** Must match backend `CEFR_STEPS` + `parseCefrStep` in `cefr-vocabulary-target.util.ts`. */
const CEFR_STEPS_EXTENDED = [
  "Pre-A1",
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const;

const B1_STEP_INDEX = CEFR_STEPS_EXTENDED.indexOf("B1");

export type CefrLevel = (typeof ORDER)[number];

export function parseCefrLevel(text: string): CefrLevel {
  const m = text.trim().match(/\b(A1|A2|B1|B2|C1|C2)\b/i);
  if (!m?.[1]) return "A1";
  return m[1].toUpperCase() as CefrLevel;
}

/**
 * Mirrors backend `parseCefrStep` — identifies Pre-A1 through C2 when present in profile text.
 */
function parseExtendedCefrStep(raw: string | null | undefined): number | null {
  if (!raw?.trim()) return null;
  const s = raw.trim().toLowerCase();
  if (/\bpre[-\s]?a1\b/.test(s)) return 0;
  if (/\ba1\b/.test(s)) return 1;
  if (/\ba2\b/.test(s)) return 2;
  if (/\bb1\b/.test(s)) return 3;
  if (/\bb2\b/.test(s)) return 4;
  if (/\bc1\b/.test(s)) return 5;
  if (/\bc2\b/.test(s)) return 6;
  if (/\bbeginner|elementary|starter\b/.test(s)) return 1;
  if (/\bintermediate\b/.test(s)) return 3;
  if (/\badvanced\b/.test(s)) return 5;
  if (/\bproficient|mastery\b/.test(s)) return 6;
  return null;
}

/**
 * Open “2–3 sentences” video summary: Pre-A1–A2 omit; B1+ include. Unknown level → include (server default).
 */
export function shouldIncludeOpenSummaryComprehensionTask(
  englishLevel: string | null | undefined,
): boolean {
  const idx = parseExtendedCefrStep(englishLevel ?? null);
  if (idx == null) {
    return true;
  }
  return idx >= B1_STEP_INDEX;
}

export function cefrIndex(level: CefrLevel): number {
  const i = ORDER.indexOf(level);
  return i < 0 ? 0 : i;
}

export function cefrOrder(): readonly CefrLevel[] {
  return ORDER;
}
