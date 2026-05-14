import { Injectable } from "@nestjs/common";
import type { ComprehensionTestItem } from "src/content-video/content-video-comprehension-tests-gemini.client";

const EXPECTED_MCQ = 10;

export type WeeklyReviewGeminiInput = {
  lessonTitles: string[];
  combinedTranscript: string;
  learnerCefr: string | null;
  vocabularyTerms: string[];
  learningGoal: string;
  timeToAchieve: string;
  hobbies: string[];
};

export function isWeeklyMcq(
  t: ComprehensionTestItem,
): t is Extract<ComprehensionTestItem, { questionType: "multiple_choice" }> {
  return t.questionType === "multiple_choice";
}

/**
 * Calls Gemini for an all-MCQ weekly review (no per-lesson open summary).
 */
@Injectable()
export class WeeklyReviewGeminiClient {
  async generate(input: WeeklyReviewGeminiInput): Promise<ComprehensionTestItem[] | null> {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const apiUrl =
      process.env.GEMINI_API_URL ||
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }
    const level =
      input.learnerCefr?.trim() ||
      "Unknown — assume high B1: clear sentences, common idioms.";
    const titles =
      input.lessonTitles.length > 0
        ? input.lessonTitles.slice(0, 16).join("; ")
        : "(no lesson titles)";
    const vocabList =
      input.vocabularyTerms.length > 0
        ? input.vocabularyTerms.slice(0, 40).join(", ")
        : "(no saved vocabulary)";
    const hobbyLine =
      input.hobbies.length > 0
        ? input.hobbies.slice(0, 6).join(", ")
        : "(none stated)";
    const hasText =
      input.combinedTranscript != null &&
      input.combinedTranscript.trim().length >= 80;
    const transcriptBlock = hasText
      ? [
          "COMBINED TRANSCRIPTS / NOTES (ground truth for facts; every MCQ must be answerable from here):",
          input.combinedTranscript!.slice(0, 18_000),
        ].join("\n")
      : "Little or no transcript text is available. Build questions only from LESSON TITLES and learner profile; do not invent specific plot facts.";

    const prompt = [
      "You write a WEEKLY REVIEW quiz for an English learner who watched several videos this week.",
      `Return ONLY valid JSON: { "tests": [ exactly ${EXPECTED_MCQ} items ] }`,
      "",
      `=== tests (exactly ${EXPECTED_MCQ}) ===`,
      "Every item MUST be multiple_choice — no open-ended questions.",
      'Shape: {"id":"w1","questionType":"multiple_choice","category":"grammar"|"vocabulary"|"comprehension","question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}',
      "",
      "Category balance (strict):",
      `- 4 with category "comprehension" (main ideas, inference, connections across clips when transcript supports it).`,
      `- 3 with category "vocabulary" (meaning in context, collocation — from transcript or titles).`,
      `- 3 with category "grammar" (tense, articles, prepositions) grounded in sample lines from transcript when present.`,
      "",
      "Each question MUST be tied to this week’s lesson material (titles + transcript block).",
      "If multiple clips appear, a few questions may compare or synthesize — without requiring memory outside the transcript.",
      "correctIndex is 0-based. Four options per MCQ.",
      "explanation: 1–2 sentences, supportive tone.",
      "",
      `LEARNER LEVEL: ${level}`,
      "SAVED VOCABULARY (optional hooks):",
      vocabList,
      "",
      "STUDYING PLAN:",
      `- Goal: ${input.learningGoal}`,
      `- Horizon: ${input.timeToAchieve}`,
      `- Hobbies: ${hobbyLine}`,
      "",
      "LESSON TITLES THIS WEEK:",
      titles,
      "",
      transcriptBlock,
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
            temperature: 0.3,
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
      if (!Array.isArray(parsed.tests) || parsed.tests.length === 0) {
        return null;
      }
      const out: ComprehensionTestItem[] = [];
      let idx = 0;
      for (const raw of parsed.tests) {
        if (out.length >= EXPECTED_MCQ) {
          break;
        }
        if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
          continue;
        }
        const o = raw as Record<string, unknown>;
        if (o.questionType !== "multiple_choice") {
          continue;
        }
        const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : `w${idx + 1}`;
        const question = typeof o.question === "string" ? o.question.trim() : "";
        const optionsRaw = o.options;
        if (question.length < 8 || !Array.isArray(optionsRaw)) {
          continue;
        }
        const options = optionsRaw
          .filter((x): x is string => typeof x === "string")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        while (options.length < 4) {
          options.push("—");
        }
        const opts = options.slice(0, 4);
        let ci =
          typeof o.correctIndex === "number" && Number.isFinite(o.correctIndex)
            ? Math.floor(o.correctIndex)
            : 0;
        ci = Math.max(0, Math.min(3, ci));
        const cat = o.category;
        const category =
          cat === "grammar" ? ("grammar" as const)
          : cat === "vocabulary" ? ("vocabulary" as const)
          : ("comprehension" as const);
        const explanation =
          typeof o.explanation === "string" ? o.explanation.trim() : "";
        out.push({
          questionType: "multiple_choice",
          id,
          question,
          options: opts,
          correctIndex: ci,
          category,
          explanation:
            explanation.length > 0 ? explanation : "Review the transcript or title context.",
        });
        idx += 1;
      }
      if (out.length < EXPECTED_MCQ) {
        return null;
      }
      return out.slice(0, EXPECTED_MCQ);
    } catch {
      return null;
    }
  }
}

export function fallbackWeeklyReviewTests(input: WeeklyReviewGeminiInput): ComprehensionTestItem[] {
  const t0 = input.lessonTitles[0]?.trim().slice(0, 72) || "this week’s first lesson";
  const t1 = input.lessonTitles[1]?.trim().slice(0, 72) || "another lesson you opened";
      const goal = input.learningGoal?.trim().slice(0, 80) || "your English goals";
  const mcq: ComprehensionTestItem[] = [
    {
      questionType: "multiple_choice",
      id: "w1",
      category: "comprehension",
      question: `Weekly check: which statement best matches a likely theme across clips like “${t0}” and “${t1}”?`,
      options: [
        "Building listening and useful phrases from real video input",
        "Avoiding every new word from the clips",
        "Ignoring the speakers’ main ideas",
        "Only memorising usernames from credits",
      ],
      correctIndex: 0,
      explanation: "Weekly review should connect back to active viewing and language uptake.",
    },
    {
      questionType: "multiple_choice",
      id: "w2",
      category: "comprehension",
      question:
        "Why is spacing several short sessions across the week usually better than one very long passive binge?",
      options: [
        "Spaced exposure helps noticing and retention",
        "Long binge viewing guarantees no forgetting",
        "One session removes the need for subtitles",
        "Hours without breaks always lower listening scores",
      ],
      correctIndex: 0,
      explanation: "Distributed practice supports memory and skill consolidation.",
    },
    {
      questionType: "multiple_choice",
      id: "w3",
      category: "comprehension",
      question: `You listed “${goal}” as a study aim. What should weekly clips mainly supply toward that?`,
      options: [
        "Input that maps onto situations and phrases you can reuse",
        "Random facts unrelated to your aim",
        "Only background music",
        "Static images without speech",
      ],
      correctIndex: 0,
      explanation: "Choose content that feeds your stated goal when possible.",
    },
    {
      questionType: "multiple_choice",
      id: "w4",
      category: "vocabulary",
      question:
        "In weekly review, what does “gist listening” usually mean?",
      options: [
        "Track overall meaning without catching every word",
        "Decode every syllable before moving on",
        "Mute audio and read thumbnails only",
        "Skip the middle of each video",
      ],
      correctIndex: 0,
      explanation: "Gist listening targets global understanding first.",
    },
    {
      questionType: "multiple_choice",
      id: "w5",
      category: "vocabulary",
      question: "Which pair sounds like natural classroom or self-study language?",
      options: [
        "Could you replay that segment more slowly?",
        "Could you replay that segment more slow?",
        "Could you replay slow that segment?",
        "Could replay that segment slowerly?",
      ],
      correctIndex: 0,
      explanation: "Adverb placement and comparatives follow common patterns.",
    },
    {
      questionType: "multiple_choice",
      id: "w6",
      category: "vocabulary",
      question:
        "After noting a new chunk from a clip, what is the most useful next micro-step?",
      options: [
        "Say it aloud in a short sentence of your own",
        "Never pronounce it",
        "Only copy timestamps",
        "Delete it from notes immediately",
      ],
      correctIndex: 0,
      explanation: "Active production strengthens recall.",
    },
    {
      questionType: "multiple_choice",
      id: "w7",
      category: "grammar",
      question: "Which sentence is grammatically correct?",
      options: [
        "I have watched three lessons this week and noted useful phrases.",
        "I has watched three lessons this week and noted useful phrases.",
        "I have watch three lessons this week and noted useful phrases.",
        "I watching three lessons this week and noted useful phrases.",
      ],
      correctIndex: 0,
      explanation: "Present perfect + past participle for experience this week.",
    },
    {
      questionType: "multiple_choice",
      id: "w8",
      category: "grammar",
      question: "Choose the best article: “That was ___ insightful point in the video.”",
      options: ["an", "a", "the", "— (zero article)"],
      correctIndex: 0,
      explanation: "Use “an” before vowel sounds.",
    },
    {
      questionType: "multiple_choice",
      id: "w9",
      category: "grammar",
      question: "Which completes: “They focus ___ helping learners notice chunks.”",
      options: ["on", "at", "for", "of"],
      correctIndex: 0,
      explanation: "“Focus on” is fixed.",
    },
    {
      questionType: "multiple_choice",
      id: "w10",
      category: "comprehension",
      question:
        "What is the main purpose of this weekly review quiz in the learner app?",
      options: [
        "Reconnect skills across lessons you touched this week",
        "Replace all future quizzes on individual videos",
        "Skip watching videos next week",
        "Remove vocabulary review entirely",
      ],
      correctIndex: 0,
      explanation: "Weekly review reinforces cross-lesson learning.",
    },
  ];
  return mcq;
}

export function normalizeWeeklyReviewTests(
  tests: ComprehensionTestItem[],
): ComprehensionTestItem[] {
  return tests.filter(isWeeklyMcq).slice(0, EXPECTED_MCQ);
}
