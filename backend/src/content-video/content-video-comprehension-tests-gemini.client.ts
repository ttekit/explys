import { Injectable } from "@nestjs/common";

export type ComprehensionTestItem = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  /** Comprehension vs grammar (tense, articles, prepositions, word form). */
  category: "comprehension" | "grammar";
};

export type ComprehensionTestsGenerationContext = {
  videoName: string;
  videoDescription: string | null;
  /** Plain text from WebVTT (may be empty if no captions). */
  transcriptPlain: string | null;
  /** Learner CEFR / English level label, e.g. "B1" or "Intermediate". */
  learnerCefr: string | null;
  /** User's known terms (same study language as transcript); use for difficulty + overlap. */
  vocabularyTerms: string[];
};

@Injectable()
export class ContentVideoComprehensionTestsGeminiClient {
  async generateTests(
    input: ComprehensionTestsGenerationContext,
  ): Promise<ComprehensionTestItem[] | null> {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const apiUrl =
      process.env.GEMINI_API_URL ||
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }

    const hasTranscript =
      input.transcriptPlain != null && input.transcriptPlain.trim().length >= 40;
    const level =
      input.learnerCefr?.trim() ||
      "Unknown — assume high B1: clear sentences, common idioms, no specialist jargon.";
    const vocabList =
      input.vocabularyTerms.length > 0
        ? input.vocabularyTerms.slice(0, 50).join(", ")
        : "(no saved vocabulary for this user — infer level only from CEFR and transcript.)";

    const transcriptBlock = hasTranscript
      ? [
          "VIDEO TRANSCRIPT (ground truth; every fact and quoted word must come from here):",
          input.transcriptPlain!.slice(0, 14_000),
        ].join("\n")
      : "No transcript is available. Use only the title and description; keep questions general and do not invent specific facts.";

    const prompt = [
      "You create multiple-choice tests for someone learning English from a video: comprehension AND grammar.",
      "Return ONLY valid JSON: { \"tests\": [ ... ] } with exactly 9 items.",
      'Each item: {"id":"t1","category":"comprehension"|"grammar","question":"...","options":["A","B","C","D"],"correctIndex":0}',
      "Field \"category\" is required: use \"comprehension\" for meaning, main idea, or detail; use \"grammar\" for tense, articles (a/the), prepositions, word form, subject–verb agreement, or choosing the only grammatically correct sentence among four short options. Grammar items must be grounded in ideas or paraphrases from the transcript (or title/description if no transcript) — not random unrelated grammar.",
      "correctIndex is 0-based. Four options; one clear best answer; plausible wrong answers at the same difficulty.",
      "",
      "QUESTION MIX (strict) — 9 total:",
      "- 3 with category \"grammar\" (distribute: e.g. tense/aspect, article or determiner, preposition or collocation) at the learner's CEFR.",
      hasTranscript
        ? "- 2 with category \"comprehension\" MUST ask what a specific word or phrase from the transcript means in context. Quote a short phrase that appears in the transcript."
        : "- 2 questions about meaning of terms implied by the title or description (comprehension).",
      hasTranscript
        ? "- 1 \"comprehension\" MUST be \"why is ___ important?\" (or why it matters) about the transcript’s message or step."
        : "- 1 comprehension about why the main topic matters for learners.",
      "- Remaining comprehension items: detail or inference; still use category \"comprehension\".",
      "",
      "DIFFICULTY: Match the learner CEFR / level below. Vocabulary: prefer words that appear in BOTH the transcript and the learner's word list when it makes sense; otherwise pick fair words from the transcript.",
      "",
      "LEARNER ENGLISH LEVEL (adjust sentence length in questions and option wording):",
      level,
      "",
      "LEARNER'S SAVED VOCABULARY (for overlap and pitch):",
      vocabList,
      "",
      transcriptBlock,
      "",
      `Video title: ${input.videoName}`,
      `Description: ${input.videoDescription?.trim() || "N/A"}`,
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
            temperature: 0.25,
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
      const parsed = JSON.parse(text) as { tests?: unknown };
      if (!parsed?.tests || !Array.isArray(parsed.tests)) {
        return null;
      }
      const tests = normalizeTests(parsed.tests);
      return tests.length > 0 ? tests : null;
    } catch {
      return null;
    }
  }
}

function normalizeTests(raw: unknown[]): ComprehensionTestItem[] {
  const out: ComprehensionTestItem[] = [];
  let n = 0;
  for (const item of raw) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : `t${++n}`;
    const question =
      typeof o.question === "string"
        ? o.question.slice(0, 500)
        : "What is the main idea of the video?";
    let options: string[] = [];
    if (Array.isArray(o.options)) {
      options = o.options
        .filter((x): x is string => typeof x === "string")
        .map((s) => s.slice(0, 200));
    }
    if (options.length < 2) {
      options = ["Option A", "Option B", "Option C", "Option D"];
    }
    let correctIndex = 0;
    if (typeof o.correctIndex === "number" && Number.isFinite(o.correctIndex)) {
      correctIndex = Math.max(0, Math.min(options.length - 1, Math.floor(o.correctIndex)));
    }
    const cat = o.category === "grammar" ? "grammar" : "comprehension";
    out.push({ id, question, options, correctIndex, category: cat });
  }
  return out;
}

const STOP = new Set(
  "the and that this with from your have been were they their what when will would could should about there which their more some very just into also than then only over such".split(
    " ",
  ),
);

/**
 * Picks a few content words for fallback vocabulary-style questions.
 */
function pickTranscriptContentWords(plain: string, max: number): string[] {
  const found = new Set<string>();
  const re = /\b[a-zA-Z']{5,20}\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(plain)) && found.size < max + 4) {
    const w = m[0].toLowerCase();
    if (STOP.has(w)) {
      continue;
    }
    found.add(m[0]);
  }
  return [...found].slice(0, max);
}

/**
 * Heuristic MCQs when Gemini is unavailable.
 */
export function fallbackComprehensionTests(ctx: {
  videoName: string;
  transcriptPlain: string | null;
  learnerCefr: string | null;
  vocabularyTerms: string[];
}): ComprehensionTestItem[] {
  const label = ctx.videoName.slice(0, 80) || "this lesson";
  const plain = ctx.transcriptPlain?.trim() ?? "";
  const words = plain.length >= 40 ? pickTranscriptContentWords(plain, 2) : [];
  const v0 = words[0] ?? (ctx.vocabularyTerms[0] ?? "key idea");
  const v1 = words[1] ?? (ctx.vocabularyTerms[1] ?? "main point");
  const level = ctx.learnerCefr?.trim() || "the learner’s level";

  const tests: ComprehensionTestItem[] = [
    {
      id: "c1",
      category: "comprehension",
      question:
        plain.length >= 40
          ? `In this video, what does the word or phrase “${v0}” most likely refer to?`
          : `What is “${label}” mainly about?`,
      options: [
        "Something central to the lesson’s topic in the video",
        "A random unrelated object",
        "A character from a different story",
        "Only background music, not ideas",
      ],
      correctIndex: 0,
    },
    {
      id: "c2",
      category: "comprehension",
      question:
        plain.length >= 40
          ? `What does “${v1}” mean in the context of this content? (Choose the best paraphrase.)`
          : `For someone at ${level}, what is a sensible goal for this kind of video?`,
      options: [
        "To learn language tied to the topic and notice useful phrases",
        "To ignore all new words",
        "To memorise the credits only",
        "To only watch without listening",
      ],
      correctIndex: 0,
    },
    {
      id: "c3",
      category: "comprehension",
      question: `Why is “${label.slice(0, 60) || "this topic"}” important for language practice?`,
      options: [
        "It gives listening and vocabulary in a realistic context",
        "It is only for native speakers of another language",
        "It has no learning value",
        "It only tests speed typing",
      ],
      correctIndex: 0,
    },
    {
      id: "c4",
      category: "comprehension",
      question: "What is one good strategy while following this type of video?",
      options: [
        "Connect new words to the topic and replay short segments",
        "Turn off the sound completely",
        "Read only unrelated social media at the same time",
        "Skip every second sentence on purpose",
      ],
      correctIndex: 0,
    },
    {
      id: "c5",
      category: "comprehension",
      question:
        ctx.vocabularyTerms.length > 0
          ? `Your list includes the term “${ctx.vocabularyTerms[0]}”. What does the video most likely help you do with terms like that?`
          : "What does watching with captions (when available) help you notice?",
      options: [
        "How words and phrases sound in context and how they are spelled",
        "Only the file size of the video",
        "The weather forecast",
        "Nothing at all",
      ],
      correctIndex: 0,
    },
    {
      id: "c6",
      category: "comprehension",
      question: "Why might repeating a line from the video be useful for learning?",
      options: [
        "It helps pronunciation and memory for useful chunks of language",
        "It is never useful",
        "It only works for non-English content",
        "It only helps with mathematics",
      ],
      correctIndex: 0,
    },
    {
      id: "g1",
      category: "grammar",
      question:
        "Which sentence is grammatically correct for talking about a finished experience?",
      options: [
        "I have watched the video and learned a few new phrases.",
        "I have watch the video and learned a few new phrases.",
        "I has watched the video and learned a few new phrases.",
        "I watching the video and learned a few new phrases.",
      ],
      correctIndex: 0,
    },
    {
      id: "g2",
      category: "grammar",
      question: "Choose the best article: “I saw ___ interesting explanation in the video.”",
      options: ["an", "a", "the", "— (no article)"],
      correctIndex: 0,
    },
    {
      id: "g3",
      category: "grammar",
      question:
        "Which option correctly completes: “The speaker focuses ___ helping learners with listening.”",
      options: ["on", "at", "for", "by"],
      correctIndex: 0,
    },
  ];
  return tests;
}
