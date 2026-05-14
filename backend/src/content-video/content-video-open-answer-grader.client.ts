import { Injectable } from "@nestjs/common";

/** Correct on the written summary when the model score reaches this minimum (inclusive). */
export const OPEN_SUMMARY_PASS_MIN_SCORE = 7;

export type OpenSummaryGrade = {
  /** Integer 1–10 from the model */
  score: number;
  /** Derived: {@link score} >= {@link OPEN_SUMMARY_PASS_MIN_SCORE} */
  pass: boolean;
  /** Coaching: relevance to video, grammar, and study tips */
  feedback: string;
};

/** Optional profile for tailoring vocabulary/grammar memorization advice. */
export type LearnerProfileHints = {
  job: string | null;
  education: string | null;
  hobbies: string[];
};

export function parseOpenSummaryScore(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const r = Math.round(value);
    if (r < 1 || r > 10) {
      return null;
    }
    return r;
  }
  if (typeof value === "string") {
    const n = Number.parseInt(value.trim(), 10);
    if (!Number.isFinite(n)) {
      return null;
    }
    if (n < 1 || n > 10) {
      return null;
    }
    return n;
  }
  return null;
}

/**
 * Pass/fail plus short learning feedback for the learner's written summary.
 */
@Injectable()
export class ContentVideoOpenAnswerGraderClient {
  /**
   * Binary pass/fail only — used when callers do not need feedback.
   * Prefer {@link gradeOpenSummary} in new code.
   */
  async isSummaryAdequate(input: {
    videoName: string;
    videoDescription: string | null;
    transcriptPlain: string | null;
    learnerAnswer: string;
    learnerCefr: string | null;
    learnerProfile?: LearnerProfileHints | null;
  }): Promise<boolean | null> {
    const r = await this.gradeOpenSummary(input);
    if (!r) return null;
    return r.pass;
  }

  async gradeOpenSummary(input: {
    videoName: string;
    videoDescription: string | null;
    transcriptPlain: string | null;
    learnerAnswer: string;
    learnerCefr: string | null;
    learnerProfile?: LearnerProfileHints | null;
  }): Promise<OpenSummaryGrade | null> {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const apiUrl =
      process.env.GEMINI_API_URL ||
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }

    const transcriptChunk =
      input.transcriptPlain != null && input.transcriptPlain.trim().length >= 40
        ? input.transcriptPlain.trim().slice(0, 6000)
        : "(no transcript — judge only from title and description)";

    const lp = input.learnerProfile;
    const hasProfile =
      lp != null &&
      (Boolean(lp.job?.trim()) ||
        Boolean(lp.education?.trim()) ||
        (lp.hobbies?.length ?? 0) > 0);

    const profileLines = hasProfile
      ? [
          "LEARNER PROFILE (use only to personalize study tips — do not invent facts):",
          lp!.job?.trim()
            ? `Job / role: ${lp!.job.trim()}`
            : "Job / role: (not provided)",
          lp!.education?.trim()
            ? `Education: ${lp!.education.trim()}`
            : "Education: (not provided)",
          lp!.hobbies && lp!.hobbies.length > 0
            ? `Hobbies / interests: ${lp!.hobbies.slice(0, 14).join("; ")}`
            : "Hobbies / interests: (not provided)",
          "",
        ]
      : [
          "LEARNER PROFILE: not provided — memorization tips should be generally useful.",
          "",
        ];

    const prompt = [
      "You review a short English learner summary (about 2–3 sentences) of a video. Use an IELTS-style coaching tone: warm, clear, specific.",
      'Return ONLY valid JSON with this exact shape: {"score": integer, "feedback": string}',
      `Field "score": integer from 1 to 10 inclusive. Decide using BOTH:`,
      "  • How well the answer reflects the VIDEO (main idea and at least some concrete connection to the transcript/context — penalize off-topic or generic fluff).",
      "  • Grammar and clarity appropriate to the learner level — minor errors can still score highly if meaning and relevance are strong; many serious errors or incoherence lower the score.",
      `  Rough guide: 1–3 = largely irrelevant or unreadable; 4–6 = partial relevance or weak language; ${OPEN_SUMMARY_PASS_MIN_SCORE}–10 = clearly about this video with acceptable learner English.`,
      'Field "feedback": One cohesive paragraph in English (aim under ~170 words). Order your points naturally and include:',
      "  • Brief comments on relevance to the video (what landed well / what’s missing vs the content).",
      "  • Specific grammar or wording fixes (examples at their level, not abstract rules only).",
      "  • One strength, brief encouragement.",
      "  • One or two practical tips for memorizing new vocabulary from the lesson.",
      "  • One grammar-study tip tied to mistakes in their summary.",
      'Do NOT include any other top-level JSON keys.',
      "Do not name the product or API. Do not repeat the rubric verbatim.",
      "",
      ...profileLines,
      `Video title: ${input.videoName}`,
      `Description: ${input.videoDescription?.trim() || "N/A"}`,
      `Learner level hint: ${input.learnerCefr?.trim() || "B1"}`,
      "",
      "VIDEO / CONTEXT:",
      transcriptChunk,
      "",
      "LEARNER ANSWER:",
      input.learnerAnswer.trim().slice(0, 1200),
    ].join("\n");

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            responseMimeType: "application/json",
          },
        }),
      });
      if (!response.ok) {
        return null;
      }
      const payload = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== "string") {
        return null;
      }
      const parsed = JSON.parse(text) as {
        score?: unknown;
        feedback?: unknown;
      };
      const score = parseOpenSummaryScore(parsed?.score);
      if (score === null) {
        return null;
      }
      const feedback =
        typeof parsed?.feedback === "string" ? parsed.feedback.trim() : "";
      if (!feedback) {
        return null;
      }
      const pass = score >= OPEN_SUMMARY_PASS_MIN_SCORE;
      return {
        score,
        pass,
        feedback: feedback.slice(0, 2000),
      };
    } catch {
      return null;
    }
  }
}

/** Fallback when the grading API is unavailable: length + sentence boundaries. */
export function heuristicOpenSummaryPass(text: string): boolean {
  const t = text.trim();
  if (t.length < 40) {
    return false;
  }
  const sentences = t.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 5);
  return sentences.length >= 2;
}

/** Short copy when the grading API is not configured or the request failed. */
export function offlineOpenSummaryFeedback(pass: boolean): string {
  return pass
    ? "Your summary meets the minimum length and structure. Next time, add one specific example or phrase you heard in the lesson to make it even stronger."
    : "Aim for two or three sentences that state what the video was mainly about and mention one concrete detail (idea, example, or tip) from what you watched.";
}
