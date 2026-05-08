import { Injectable } from "@nestjs/common";

export type VocabularyPersonalizeGeminiRow = {
  word: string;
  nativeTranslation: string | null;
  learnerDescription: string;
  pronunciation: string | null;
};

@Injectable()
export class VocabularyPersonalizeGeminiClient {
  async personalize(input: {
    words: string[];
    learnerCefrBand: string;
    nativeLanguageLabel: string | null;
    nativeLanguageIso: string | undefined;
  }): Promise<VocabularyPersonalizeGeminiRow[] | null> {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const apiUrl =
      process.env.GEMINI_API_URL ||
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || input.words.length === 0) {
      return null;
    }

    const wantNative =
      input.nativeLanguageIso &&
      input.nativeLanguageIso !== "en" &&
      input.nativeLanguageLabel;

    const prompt = [
      "You help English learners understand lesson vocabulary.",
      'Return ONLY valid JSON: {"items":[{"word":string,"nativeTranslation":string|null,"learnerDescription":string,"pronunciation":string|null}]}',
      "Rules:",
      `• learnerDescription: explain the English word IN ENGLISH using vocabulary and grammar suited to CEFR level ${input.learnerCefrBand}. One or two short sentences max (~220 chars each). No phonetic-only descriptions.`,
      wantNative
        ? `• nativeTranslation: a short equivalent or gloss IN THE LEARNER'S NATIVE LANGUAGE (${input.nativeLanguageLabel}). For multi-word English items, translate the whole chunk. Use null only if impossible.`
        : "• nativeTranslation: null (learner native language is English or unknown — leave null).",
      "• pronunciation: IPA or simple ASCII pronunciation hint if easy; else null.",
      "• Cover EVERY input word exactly once, same spelling as given (case-insensitive match allowed in 'word' field but must be the same lemma/phrase).",
      "",
      "INPUT WORDS:",
      JSON.stringify(input.words),
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
        items?: unknown;
      };
      if (!Array.isArray(parsed?.items)) {
        return null;
      }
      const out: VocabularyPersonalizeGeminiRow[] = [];
      for (const row of parsed.items) {
        if (!row || typeof row !== "object") continue;
        const o = row as Record<string, unknown>;
        const word = typeof o.word === "string" ? o.word.trim() : "";
        const learnerDescription =
          typeof o.learnerDescription === "string"
            ? o.learnerDescription.trim()
            : "";
        if (word.length < 2 || learnerDescription.length < 4) continue;
        let nativeTranslation: string | null =
          typeof o.nativeTranslation === "string"
            ? o.nativeTranslation.trim()
            : null;
        if (nativeTranslation === "") nativeTranslation = null;
        const pronunciation =
          typeof o.pronunciation === "string" && o.pronunciation.trim()
            ? o.pronunciation.trim()
            : null;
        out.push({
          word,
          nativeTranslation,
          learnerDescription: learnerDescription.slice(0, 600),
          pronunciation,
        });
      }
      return out.length > 0 ? out : null;
    } catch {
      return null;
    }
  }
}
