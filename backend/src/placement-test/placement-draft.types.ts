/** Stored on `User.placementTestDraft` while the entry test iframe is served. */

import type { PlacementQuestionType } from "./placement-test.types";

export const PLACEMENT_DRAFT_VERSION = 1 as const;

export type PlacementStoredDraftQuestion = {
  id: string;
  correctIndex: 0 | 1 | 2 | 3;
  /** Present for drafts issued after skill-aware placement; omit = unknown. */
  type?: PlacementQuestionType;
  /** Prompt excerpt for grammar topic inference (optional; older drafts omit). */
  promptShort?: string;
  /** Correct option text for vocabulary highlights (optional). */
  answerText?: string;
};

export interface PlacementStoredDraft {
  readonly v: typeof PLACEMENT_DRAFT_VERSION;
  readonly issuedAt: string;
  readonly questions: PlacementStoredDraftQuestion[];
}

export function parsePlacementDraft(
  raw: unknown,
): PlacementStoredDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const x = raw as Record<string, unknown>;
  if (x.v !== PLACEMENT_DRAFT_VERSION || typeof x.issuedAt !== "string") {
    return null;
  }
  if (!Array.isArray(x.questions)) return null;
  const questions: PlacementStoredDraftQuestion[] = [];
  for (const row of x.questions) {
    if (!row || typeof row !== "object") return null;
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : null;
    const ci =
      typeof r.correctIndex === "number"
        ? r.correctIndex
        : typeof r.correctIndex === "string"
          ? parseInt(String(r.correctIndex), 10)
          : NaN;
    if (!id || !Number.isFinite(ci) || ci < 0 || ci > 3) return null;
    const qt = r.type;
    const type: PlacementStoredDraftQuestion["type"] =
      qt === "grammar" || qt === "vocabulary" ? qt : undefined;

    let promptShort: string | undefined;
    if (typeof r.promptShort === "string") {
      const s = r.promptShort.replace(/\s+/g, " ").trim().slice(0, 400);
      if (s) {
        promptShort = s;
      }
    }
    let answerText: string | undefined;
    if (typeof r.answerText === "string") {
      const s = r.answerText.replace(/\s+/g, " ").trim().slice(0, 400);
      if (s) {
        answerText = s;
      }
    }

    questions.push({
      id,
      correctIndex: ci as 0 | 1 | 2 | 3,
      ...(type ? { type } : {}),
      ...(promptShort ? { promptShort } : {}),
      ...(answerText ? { answerText } : {}),
    });
  }
  if (!questions.length) return null;
  return { v: PLACEMENT_DRAFT_VERSION, issuedAt: x.issuedAt, questions };
}
