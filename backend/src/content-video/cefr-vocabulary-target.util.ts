/** CEFR steps for computing vocabulary stretch target (one band above learner). */
const CEFR_STEPS = [
  "Pre-A1",
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
] as const;

export type CefrVocabularyStretch = {
  /** Normalized learner band, if parsed from profile */
  learnerBand: (typeof CEFR_STEPS)[number] | null;
  /** Band to target for key vocabulary (min learner+1, max C2) */
  vocabularyTargetBand: (typeof CEFR_STEPS)[number];
  /** Single paragraph for model prompts */
  instruction: string;
};

function parseCefrStep(learnerCefr: string | null | undefined): number | null {
  if (!learnerCefr?.trim()) return null;
  const s = learnerCefr.trim().toLowerCase();

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

/** Normalized CEFR label for storage (e.g. A1), or null if level cannot be parsed. */
export function normalizedLearnerCefrBand(
  learnerCefr: string | null | undefined,
): string | null {
  const idx = parseCefrStep(learnerCefr ?? null);
  if (idx == null) return null;
  return CEFR_STEPS[idx];
}

/**
 * Vocabulary for lessons should sit one CEFR band above the learner’s profile
 * so items are stretch goals, not only comfort-zone words.
 */
export function cefrStretchForKeyVocabulary(
  learnerCefr: string | null | undefined,
): CefrVocabularyStretch {
  const idx = parseCefrStep(learnerCefr ?? null);
  if (idx == null) {
    return {
      learnerBand: null,
      vocabularyTargetBand: "B1",
      instruction:
        "No CEFR on file. For keyVocabulary only: pick words/chunks from this video at solid B1 (stretch slightly beyond basic phrasebook English), still grounded in the transcript.",
    };
  }
  const learnerBand = CEFR_STEPS[idx];
  const targetIdx = Math.min(idx + 1, CEFR_STEPS.length - 1);
  const vocabularyTargetBand = CEFR_STEPS[targetIdx];
  return {
    learnerBand,
    vocabularyTargetBand,
    instruction: [
      `The learner’s profile level is ${learnerBand}.`,
      `For keyVocabulary ONLY: choose words and multi-word chunks appropriate for ${vocabularyTargetBand} (exactly one CEFR band harder than ${learnerBand}), while still actually appearing or paraphrasable from this video.`,
      idx >= CEFR_STEPS.length - 1
        ? `Learner is already ${learnerBand}; keep keyVocabulary at rich ${vocabularyTargetBand} use (nuanced, precise items from the clip).`
        : "",
    ]
      .filter(Boolean)
      .join(" "),
  };
}
