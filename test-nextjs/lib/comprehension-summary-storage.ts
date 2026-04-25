import type { SubmitComprehensionTestResponse } from "./types";

const SESSION_KEY = "eng_curses_comprehension_summary_v1";

export const COMPREHENSION_SUMMARY_PATH = "/test/comprehension-summary";

export type ComprehensionSummaryPayload = {
  contentVideoId: number;
  videoName: string;
  learnerCefr: string | null;
  vocabularyTerms: string[];
  result: SubmitComprehensionTestResponse;
};

export function storeComprehensionSummary(payload: ComprehensionSummaryPayload): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode
  }
}

export function readComprehensionSummaryFromSession(): ComprehensionSummaryPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as {
      contentVideoId?: number;
      videoName?: string;
      learnerCefr?: string | null;
      vocabularyTerms?: string[];
      result?: SubmitComprehensionTestResponse;
    };
    if (!p || typeof p.contentVideoId !== "number" || !p.result) {
      return null;
    }
    if (typeof p.result.correct !== "number") {
      return null;
    }
    const vocabularyTerms = Array.isArray(p.vocabularyTerms)
      ? p.vocabularyTerms
      : p.result.vocabularyTerms ?? [];
    const learnerCefr =
      p.learnerCefr !== undefined ? p.learnerCefr : p.result.learnerCefr ?? null;
    return {
      contentVideoId: p.contentVideoId,
      videoName: p.videoName ?? "",
      learnerCefr,
      vocabularyTerms,
      result: p.result,
    };
  } catch {
    return null;
  }
}

export function clearComprehensionSummarySession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

/** Query string for `/test/comprehension-summary?...` — matches `parseUrlSummary` on that page. */
export function buildComprehensionSummaryQueryString(
  contentVideoId: number,
  videoName: string,
  result: SubmitComprehensionTestResponse,
): string {
  const p = new URLSearchParams();
  p.set("contentVideoId", String(contentVideoId));
  p.set("videoName", videoName.slice(0, 400));
  p.set("correct", String(result.correct));
  p.set("total", String(result.total));
  p.set("percentage", String(result.percentage));
  p.set("cc", String(result.comprehension.correct));
  p.set("ct", String(result.comprehension.total));
  p.set("gc", String(result.grammar.correct));
  p.set("gt", String(result.grammar.total));
  if (result.message?.trim()) {
    p.set("msg", result.message.trim().slice(0, 800));
  }
  if (result.learnerCefr?.trim()) {
    p.set("cefr", result.learnerCefr.trim());
  }
  const vt = result.vocabularyTerms.slice(0, 45);
  if (vt.length > 0) {
    p.set("vt", JSON.stringify(vt));
  }
  if (result.knowledgeUpdates.length > 0) {
    p.set("ku", JSON.stringify(result.knowledgeUpdates));
  }
  return p.toString();
}

/** If the URL would be too long for some browsers, store in session and navigate without query. */
export function maxSummaryQueryUrlLength(): number {
  return 7500;
}
