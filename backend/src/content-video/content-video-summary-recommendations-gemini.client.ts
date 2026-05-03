import { Injectable } from "@nestjs/common";

export type SummaryRecommendationsResult = {
  headline: string;
  summary: string;
  focusWords: string[];
  nextSteps: string[];
  encouragement: string;
};

export type SummaryRecommendationsInput = {
  videoName: string;
  learnerCefr: string | null;
  vocabularyTerms: string[];
  correct: number;
  total: number;
  percentage: number;
  comprehension: { correct: number; total: number };
  grammar: { correct: number; total: number };
};

@Injectable()
export class ContentVideoSummaryRecommendationsGeminiClient {
  async generate(
    input: SummaryRecommendationsInput,
  ): Promise<SummaryRecommendationsResult | null> {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const apiUrl =
      process.env.GEMINI_API_URL ||
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }

    const level = input.learnerCefr?.trim() || "unspecified CEFR";
    const vocab =
      input.vocabularyTerms.length > 0
        ? input.vocabularyTerms.slice(0, 40).join(", ")
        : "(learner has no saved vocabulary list for this context)";

    const prompt = [
      "You are a supportive English coach. The learner finished a video comprehension and grammar test.",
      "Return ONLY valid JSON (no markdown) with this exact shape:",
      `{"headline":"short celebratory or constructive title (max 80 chars)",`,
      `"summary":"2-3 sentences on how they did overall and what the scores suggest",`,
      `"focusWords":["3-8","real","vocabulary","or","phrases","to","practise","next"],`,
      `"nextSteps":["3-5","concrete","actionable","short","items"],`,
      `"encouragement":"one warm sentence"}`,
      "focusWords: prefer words that relate to the video theme or the learner’s saved words; if the list is empty, still suggest common useful words for their apparent level.",
      "nextSteps: mix review of weak areas (grammar vs comprehension) with practical habits (e.g. re-watch a scene, say sentences aloud, flashcards).",
      `Video: "${input.videoName.replace(/"/g, "'")}"`,
      `Stated / profile level: ${level}`,
      `Saved vocabulary the system used in test design (may be empty): ${vocab}`,
      `Results: ${input.correct}/${input.total} (${input.percentage}%) overall.`,
      `Comprehension: ${input.comprehension.correct}/${input.comprehension.total}.`,
      `Grammar: ${input.grammar.correct}/${input.grammar.total}.`,
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
            temperature: 0.45,
            responseMimeType: "application/json",
            maxOutputTokens: 1024,
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
      const parsed = JSON.parse(text) as Record<string, unknown>;
      return normalizeResult(parsed, input);
    } catch {
      return null;
    }
  }
}

function normalizeResult(
  raw: Record<string, unknown>,
  input: SummaryRecommendationsInput,
): SummaryRecommendationsResult {
  const headline =
    typeof raw.headline === "string" && raw.headline.trim()
      ? raw.headline.trim().slice(0, 120)
      : "Nice work on your lesson check";
  const summary =
    typeof raw.summary === "string" && raw.summary.trim()
      ? raw.summary.trim().slice(0, 800)
      : buildFallbackSummary(input);
  const focusWords = normalizeStringArray(raw.focusWords, 8, input.vocabularyTerms);
  const nextSteps = normalizeStringArray(raw.nextSteps, 5, []);
  const encouragement =
    typeof raw.encouragement === "string" && raw.encouragement.trim()
      ? raw.encouragement.trim().slice(0, 400)
      : "Keep going — every quiz makes listening and reading a little easier.";

  return {
    headline,
    summary,
    focusWords: focusWords.length > 0 ? focusWords : input.vocabularyTerms.slice(0, 6),
    nextSteps: nextSteps.length > 0 ? nextSteps : defaultNextSteps(input),
    encouragement,
  };
}

function normalizeStringArray(
  v: unknown,
  max: number,
  fallbacks: string[],
): string[] {
  if (!Array.isArray(v)) {
    return fallbacks.slice(0, max);
  }
  const out: string[] = [];
  for (const x of v) {
    if (typeof x === "string" && x.trim() && out.length < max) {
      out.push(x.trim().slice(0, 80));
    }
  }
  return out.length > 0 ? out : fallbacks.slice(0, max);
}

function buildFallbackSummary(input: SummaryRecommendationsInput): string {
  const comp =
    input.comprehension.total > 0
      ? Math.round(
          (100 * input.comprehension.correct) / input.comprehension.total,
        )
      : 0;
  const gr =
    input.grammar.total > 0
      ? Math.round((100 * input.grammar.correct) / input.grammar.total)
      : 0;
  return `You scored ${input.percentage}% overall. Comprehension was around ${comp}% and grammar around ${gr}%. ${
    gr < comp
      ? "Spend a bit more time on grammar patterns from this video when you review."
      : "Keep connecting what you hear to the main ideas — you’re building solid comprehension habits."
  }`;
}

function defaultNextSteps(input: SummaryRecommendationsInput): string[] {
  const out: string[] = [];
  if (input.grammar.correct < input.grammar.total) {
    out.push("Replay one short segment and say each line aloud, noticing verb forms and articles.");
  }
  if (input.comprehension.correct < input.comprehension.total) {
    out.push("Watch the same scene again without subtitles, then one line at a time with text.");
  }
  out.push("Write three new sentences using words from the focus list below.");
  if (out.length < 3) {
    out.push("Add 3–5 of these words to your personal flashcard deck this week.");
  }
  return out.slice(0, 5);
}

export function fallbackSummaryRecommendations(
  input: SummaryRecommendationsInput,
): SummaryRecommendationsResult {
  return {
    headline: "Your lesson results",
    summary: buildFallbackSummary(input),
    focusWords: input.vocabularyTerms.slice(0, 8).length
      ? input.vocabularyTerms.slice(0, 8)
      : ["review", "practice", "listen again", "short phrases", "key verbs"],
    nextSteps: defaultNextSteps(input),
    encouragement: "Steady progress — short regular reviews beat one long session.",
  };
}
