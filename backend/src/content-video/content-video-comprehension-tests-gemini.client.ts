import { Injectable } from "@nestjs/common";
import { cefrStretchForKeyVocabulary } from "./cefr-vocabulary-target.util";

export type KeyVocabularyItem = {
  word: string;
  definition: string;
  example: string;
};

export type McqCategory = "grammar" | "vocabulary" | "comprehension";

export type ComprehensionTestItem =
  | {
      questionType: "multiple_choice";
      id: string;
      question: string;
      options: string[];
      correctIndex: number;
      category: McqCategory;
      explanation: string;
    }
  | {
      questionType: "open";
      id: string;
      question: string;
      category: "open";
      /** Model rubric / sample points for review UI. */
      explanation: string;
    };

export type PriorWeakSpot = {
  category: string;
  stemSnippet: string;
  missCount: number;
};

export type ComprehensionTestsGenerationContext = {
  videoName: string;
  videoDescription: string | null;
  transcriptPlain: string | null;
  learnerCefr: string | null;
  vocabularyTerms: string[];
  videoThemeTags: string[];
  learnerThemeKnowledge: string[];
  priorWeakSpots: PriorWeakSpot[];
  /** Profile studying plan — `AdditionalUserData` with app defaults. */
  learningGoal: string;
  timeToAchieve: string;
  hobbies: string[];
};

const EXPECTED_TEST_COUNT = 10;
const KEY_VOCAB_COUNT = 10;

@Injectable()
export class ContentVideoComprehensionTestsGeminiClient {
  async generateTests(
    input: ComprehensionTestsGenerationContext,
  ): Promise<{
    tests: ComprehensionTestItem[];
    keyVocabulary: KeyVocabularyItem[];
  } | null> {
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
    const stretch = cefrStretchForKeyVocabulary(input.learnerCefr);
    const level =
      input.learnerCefr?.trim() ||
      "Unknown — assume high B1: clear sentences, common idioms, no specialist jargon.";
    const vocabList =
      input.vocabularyTerms.length > 0
        ? input.vocabularyTerms.slice(0, 50).join(", ")
        : "(no saved vocabulary for this user — infer level only from CEFR and transcript.)";

    const videoThemes =
      input.videoThemeTags.length > 0
        ? input.videoThemeTags.slice(0, 12).join(", ")
        : "(no theme labels for this lesson yet.)";

    const themeStrength =
      input.learnerThemeKnowledge.length > 0
        ? input.learnerThemeKnowledge.slice(0, 15).join(", ")
        : "(no learner topic-strength hints — tailor only from CEFR and vocabulary list.)";

    const weakSpots =
      input.priorWeakSpots.length > 0
        ? input.priorWeakSpots
            .slice(0, 8)
            .map(
              (w) =>
                `- [${w.category}] missed ${w.missCount}x: ${w.stemSnippet.slice(0, 220)}`,
            )
            .join("\n")
        : "(none — first attempt or no recorded misses for this user on this clip.)";

    const hobbyLine =
      input.hobbies.length > 0
        ? input.hobbies.slice(0, 6).join(", ")
        : "(none stated)";

    const transcriptBlock = hasTranscript
      ? [
          "VIDEO TRANSCRIPT (ground truth; every fact and quoted word must come from here):",
          input.transcriptPlain!.slice(0, 14_000),
        ].join("\n")
      : "No transcript is available. Use only the title and description; keep questions general and do not invent specific facts.";

    const prompt = [
      "You create an English learning assessment for a video: multiple-choice (grammar, vocabulary, comprehension), ONE open-ended summary question, AND a key vocabulary list.",
      `Return ONLY valid JSON with this exact top-level shape (no extra keys): { "tests": [ exactly ${EXPECTED_TEST_COUNT} items ], "keyVocabulary": [ exactly ${KEY_VOCAB_COUNT} items ] }`,
      "",
      `=== tests (exactly ${EXPECTED_TEST_COUNT}) ===`,
      "Include exactly ONE item with questionType \"open\" and category \"open\": ask the learner to describe in 2–3 sentences what the video was mainly about. No options or correctIndex for open.",
      `Include exactly ${EXPECTED_TEST_COUNT - 1} items with questionType \"multiple_choice\". Each MCQ MUST be:`,
      '{"id":"t1","questionType":"multiple_choice","category":"grammar"|"vocabulary"|"comprehension","question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"..."}',
      'Open item MUST be: {"id":"t_open","questionType":"open","category":"open","question":"... 2-3 sentences ...","explanation":"What a good answer should mention (short rubric for teachers/learners)."}',
      "",
      "MCQ categories (strict counts among the 9 MCQs):",
      '- 3 with category "grammar" (tense/aspect, articles, prepositions, agreement) — grounded in transcript or title/description.',
      '- 3 with category "vocabulary" (word meaning in context, collocation, phrasal verb) — quote or paraphrase from transcript when available.',
      '- 3 with category "comprehension" (detail, inference, main idea except the open summary).',
      "",
      "Field \"explanation\" on MCQs: 1–3 sentences — why the correct option is right.",
      "correctIndex is 0-based. Four options per MCQ.",
      "",
      "PRIOR MISSES — retest 2–3 similar skills in NEW wording (never copy stems):",
      weakSpots,
      "",
      "LEARNER STUDYING PLAN (from profile — use when the transcript supports it; never invent video facts):",
      `- Stated goal: ${input.learningGoal}`,
      `- Target time horizon: ${input.timeToAchieve}`,
      `- Interests / hobbies: ${hobbyLine}`,
      "Apply: Prefer MCQs, the open-summary rubric, and key vocabulary items that help toward the stated goal when the clip content allows. Use hobbies as light thematic hooks only when the video touches related ideas. Shorter horizons → favour high-utility chunks and scenarios the learner can reuse soon; longer horizons → you may include slightly broader topic words still grounded in the transcript. Questions stay transcript-grounded.",
      "",
      `=== keyVocabulary (exactly ${KEY_VOCAB_COUNT} item) ===`,
      'Each: {"word":"...","definition":"...","example":"..."}',
      "KEY VOCABULARY — LEVEL (mandatory):",
      stretch.instruction,
      `Target band label for glosses: ${stretch.vocabularyTargetBand} (not the learner’s comfort band).`,
      "- Words or multi-word chunks from the transcript (or title/description if no transcript).",
      "- Prioritise items whose semantics map onto LEARNER_TOPIC_STRENGTHS (known topic areas): new labels should connect to those domains when the video supports it.",
      "- Align several key vocabulary picks with LEARNER STUDYING PLAN (goal / interests) when transcript evidence exists; otherwise stay with neutral lesson language.",
      "- Avoid only picking the easiest, below-target high-frequency words when the clip contains suitable stretch items; definitions/examples must suit the target band above.",
      "- Generated in this same response as the tests.",
      "",
      "LEARNER LEVEL (whole quiz difficulty / tone — MCQs can stay near this level; keyVocabulary follows the stretch rule above):",
      level,
      "",
      "LEARNER SAVED VOCABULARY:",
      vocabList,
      "",
      "VIDEO_THEME_TAGS:",
      videoThemes,
      "",
      "LEARNER_TOPIC_STRENGTHS:",
      themeStrength,
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
      const parsed = JSON.parse(text) as {
        tests?: unknown;
        keyVocabulary?: unknown;
      };
      if (!parsed?.tests || !Array.isArray(parsed.tests)) {
        return null;
      }
      const tests = normalizeTests(parsed.tests);
      if (!isValidTestSet(tests)) {
        return null;
      }
      let keyVocabularyRaw = normalizeKeyVocabulary(parsed.keyVocabulary);
      if (keyVocabularyRaw.length < KEY_VOCAB_COUNT) {
        keyVocabularyRaw = fallbackKeyVocabulary({
          transcriptPlain: input.transcriptPlain,
          videoName: input.videoName,
          videoDescription: input.videoDescription,
          learnerCefr: input.learnerCefr,
          vocabularyTerms: input.vocabularyTerms,
          learnerThemeKnowledge: input.learnerThemeKnowledge,
          videoThemeTags: input.videoThemeTags,
          learningGoal: input.learningGoal,
          timeToAchieve: input.timeToAchieve,
          hobbies: input.hobbies,
        });
      }
      return { tests, keyVocabulary: keyVocabularyRaw };
    } catch {
      return null;
    }
  }
}

function isValidTestSet(tests: ComprehensionTestItem[]): boolean {
  if (tests.length !== EXPECTED_TEST_COUNT) {
    return false;
  }
  let mcq = 0;
  let open = 0;
  for (const t of tests) {
    if (t.questionType === "open") {
      open += 1;
    } else {
      mcq += 1;
    }
  }
  return mcq === EXPECTED_TEST_COUNT - 1 && open === 1;
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
    const qt = o.questionType === "open" ? "open" : "multiple_choice";

    if (qt === "open") {
      let explanation =
        typeof o.explanation === "string" ? o.explanation.trim().slice(0, 900) : "";
      if (explanation.length < 8) {
        explanation =
          "Mention the topic and at least one concrete point from the video; 2–3 clear sentences.";
      }
      out.push({
        questionType: "open",
        id,
        question,
        category: "open",
        explanation,
      });
      continue;
    }

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
    const catRaw = o.category;
    let category: McqCategory = "comprehension";
    if (catRaw === "grammar") {
      category = "grammar";
    } else if (catRaw === "vocabulary") {
      category = "vocabulary";
    } else {
      category = "comprehension";
    }
    let explanation =
      typeof o.explanation === "string" ? o.explanation.trim().slice(0, 900) : "";
    if (explanation.length < 8) {
      explanation =
        "The correct option matches the lesson evidence; distractors are plausible but do not fit as well.";
    }
    out.push({
      questionType: "multiple_choice",
      id,
      question,
      options,
      correctIndex,
      category,
      explanation,
    });
  }
  return out;
}

export function normalizeKeyVocabulary(raw: unknown): KeyVocabularyItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: KeyVocabularyItem[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const o = item as Record<string, unknown>;
    const wRaw =
      typeof o.word === "string"
        ? o.word
        : typeof o.term === "string"
          ? o.term
          : "";
    const word = wRaw.trim().slice(0, 96);
    let definition =
      typeof o.definition === "string"
        ? o.definition.trim().slice(0, 400)
        : typeof o.meaning === "string"
          ? o.meaning.trim().slice(0, 400)
          : "";
    if (word.length < 2) {
      continue;
    }
    if (definition.length < 4) {
      definition = `Key language from this lesson — use it in your own short sentence at ${word.length > 8 ? "this" : "the"} level.`;
    }
    const example =
      typeof o.example === "string" ? o.example.trim().slice(0, 320) : "";
    out.push({
      word,
      definition,
      example:
        example.length > 0
          ? example
          : `Notice how "${word}" fits the speaker's message in this clip.`,
    });
  }
  return out.slice(0, KEY_VOCAB_COUNT);
}

function themeRelevanceScore(word: string, themes: string[]): number {
  const w = word.toLowerCase();
  let score = 0;
  for (const raw of themes) {
    const t = raw.trim().toLowerCase();
    if (t.length < 2) continue;
    if (w.includes(t) || t.includes(w)) {
      score += 3;
      continue;
    }
    for (const part of t.split(/[^a-zа-яіїєґ']+/iu)) {
      if (part.length >= 4 && w.includes(part)) {
        score += 1;
      }
    }
  }
  return score;
}

/** When Gemini is off or omitted `keyVocabulary` in JSON. */
export function fallbackKeyVocabulary(ctx: {
  transcriptPlain: string | null;
  videoName: string;
  videoDescription?: string | null;
  learnerCefr: string | null;
  vocabularyTerms: string[];
  learnerThemeKnowledge?: string[];
  videoThemeTags?: string[];
  learningGoal?: string;
  timeToAchieve?: string;
  hobbies?: string[];
}): KeyVocabularyItem[] {
  const plain = ctx.transcriptPlain?.trim() ?? "";
  const title = ctx.videoName?.trim() ?? "";
  const desc = (ctx.videoDescription ?? "").trim();
  const stretch = cefrStretchForKeyVocabulary(ctx.learnerCefr);
  const targetBand = stretch.vocabularyTargetBand;
  const planGoal = ctx.learningGoal?.trim() ?? "";
  const planHorizon = ctx.timeToAchieve?.trim() ?? "";
  const hobbyList = ctx.hobbies ?? [];
  const themeHints = [
    ...(ctx.learnerThemeKnowledge ?? []),
    ...(ctx.videoThemeTags ?? []),
    ...(planGoal.length > 0 ? [planGoal] : []),
    ...(planHorizon.length > 0 ? [planHorizon] : []),
    ...hobbyList,
  ];

  const seeds: string[] = [];

  if (plain.length >= 12) {
    seeds.push(...pickTranscriptContentWords(plain, 16));
  }
  if (title.length >= 2) {
    seeds.push(...pickTranscriptContentWords(title, 8));
  }
  if (desc.length >= 8) {
    seeds.push(...pickTranscriptContentWords(desc, 8));
  }

  const seen = new Set<string>();
  const uniq: string[] = [];
  for (const raw of seeds) {
    const s = raw.trim();
    if (s.length < 2) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(s.slice(0, 80));
  }

  for (const t of ctx.vocabularyTerms) {
    const s = t.trim();
    if (s.length < 2 || uniq.length > 32) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(s.slice(0, 80));
  }

  if (themeHints.length > 0) {
    uniq.sort(
      (a, b) => themeRelevanceScore(b, themeHints) - themeRelevanceScore(a, themeHints),
    );
  }

  const label = title.slice(0, 72) || "this lesson";
  const topicHint =
    themeHints
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 6)
      .join(", ") || "the lesson topic";
  const out: KeyVocabularyItem[] = [];
  for (const w of uniq) {
    if (out.length >= KEY_VOCAB_COUNT) break;
    out.push({
      word: w,
      definition: `A stretch item (${targetBand}) from "${label}" — tied to areas like ${topicHint}.`,
      example: `"${w}" occurs in connected speech — copy stress and grouping from the narrator.`,
    });
  }

  let pad = 0;
  while (out.length < KEY_VOCAB_COUNT && pad < KEY_VOCAB_COUNT * 8) {
    const base = GENERIC_STUDY_TERMS[pad % GENERIC_STUDY_TERMS.length];
    let w = base;
    let n = 0;
    while (seen.has(w.toLowerCase()) && n < 40) {
      n += 1;
      w = `${base} (${n})`;
    }
    seen.add(w.toLowerCase());
    out.push({
      word: w,
      definition: `Study term for "${label}" at about ${targetBand}, linking listening to familiar topic ideas.`,
      example: `Try: "This clip highlights **${w.split(" (")[0]}** in real listening context."`,
    });
    pad += 1;
  }

  return out.slice(0, KEY_VOCAB_COUNT);
}

const GENERIC_STUDY_TERMS = [
  "gist",
  "detail",
  "inference",
  "collocation",
  "paraphrase",
  "register",
  "tone",
  "cue",
  "chunk",
  "utterance",
  "stance",
  "main idea",
  "supporting idea",
  "key phrase",
  "connective",
] as string[];

const STOP = new Set(
  "the and that this with from your have been were they their what when will would could should about there which their more some very just into also than then only over such для как при что это для для для это это".split(
    " ",
  ),
);

/** Letters from any script (Cyrillic, Latin, etc.) — Latin-only regex missed non-English captions. */
function pickTranscriptContentWords(text: string, max: number): string[] {
  const found = new Set<string>();
  const re = /\p{L}[\p{L}\p{M}'-]{1,30}\p{L}|\p{L}{3,32}/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && found.size < max + 24) {
    let w = m[0];
    if (w.length < 3 || w.length > 48) {
      continue;
    }
    const low = w.toLowerCase();
    if (low.length <= 5 && STOP.has(low)) {
      continue;
    }
    found.add(w);
  }
  return [...found].slice(0, max);
}

/**
 * 9 MCQ (3 grammar, 3 vocabulary, 3 comprehension) + 1 open — when Gemini is unavailable.
 */
export function fallbackComprehensionTests(ctx: {
  videoName: string;
  transcriptPlain: string | null;
  learnerCefr: string | null;
  vocabularyTerms: string[];
  priorWeakSpots: PriorWeakSpot[];
  learningGoal?: string;
  timeToAchieve?: string;
  hobbies?: string[];
}): ComprehensionTestItem[] {
  const label = ctx.videoName.slice(0, 80) || "this lesson";
  const plain = ctx.transcriptPlain?.trim() ?? "";
  const words = plain.length >= 40 ? pickTranscriptContentWords(plain, 6) : [];
  const v0 = words[0] ?? (ctx.vocabularyTerms[0] ?? "key idea");
  const v1 = words[1] ?? (ctx.vocabularyTerms[1] ?? "main idea");
  const v2 = words[2] ?? (ctx.vocabularyTerms[2] ?? "detail");
  const level = ctx.learnerCefr?.trim() || "the learner’s level";
  const goal = ctx.learningGoal?.trim() || "steady English progress";
  const horizon = ctx.timeToAchieve?.trim() || "your plan horizon";
  const firstWeak = ctx.priorWeakSpots[0];
  const grammarWeak = ctx.priorWeakSpots.find((w) => w.category === "grammar");

  const mcq: ComprehensionTestItem[] = [];

  mcq.push(
    firstWeak?.category === "comprehension"
      ? {
          questionType: "multiple_choice" as const,
          id: "c1",
          category: "comprehension" as const,
          question: `You missed a similar idea before (“${firstWeak.stemSnippet.slice(0, 140)}…”). What is the safest paraphrase of the speaker’s main focus?`,
          options: [
            "A clear, topic-relevant idea that fits the video",
            "A detail that contradicts the clip",
            "A guess unrelated to the content",
            "Only music credits, not ideas",
          ],
          correctIndex: 0,
          explanation:
            "Choose the option that matches what the lesson is actually about.",
        }
      : {
          questionType: "multiple_choice" as const,
          id: "c1",
          category: "comprehension" as const,
          question:
            plain.length >= 40
              ? `In this video, what does “${v0}” most likely refer to?`
              : `What is “${label}” mainly about?`,
          options: [
            "Something central to the lesson topic",
            "An unrelated object",
            "A random character from fiction",
            "Only background music",
          ],
          correctIndex: 0,
          explanation: "The best answer ties the phrase to the lesson topic.",
        },
  );

  mcq.push({
    questionType: "multiple_choice",
    id: "c2",
    category: "comprehension",
    question:
      plain.length >= 40
        ? `What does “${v1}” mean in this context? (best paraphrase)`
        : `For someone at ${level}, what is a sensible goal for this video?`,
    options: [
      "Learn language tied to the topic and notice useful phrases",
      "Ignore every new word",
      "Memorise credits only",
      "Watch without listening",
    ],
    correctIndex: 0,
    explanation: "Active engagement with topic language is the learning goal.",
  });

  mcq.push({
    questionType: "multiple_choice",
    id: "c3",
    category: "comprehension",
    question: `Your study goal is “${goal.slice(0, 80)}” over about ${horizon.slice(0, 48)}. Why might a clip like “${label.slice(0, 40)}” still help?`,
    options: [
      "It can build listening and phrases you reuse toward that goal",
      "Goals do not matter for video lessons",
      "Clips never relate to personal aims",
      "Only grammar rules count",
    ],
    correctIndex: 0,
    explanation:
      "Even general clips strengthen skills that support the learner’s stated aim.",
  });

  mcq.push({
    questionType: "multiple_choice",
    id: "v1",
    category: "vocabulary",
    question: `Which use of “${v2}” fits this lesson context best?`,
    options: [
      "The meaning tied to how the speaker uses it here",
      "A random dictionary sense never suggested here",
      "The opposite of its normal meaning",
      "A surname of a person",
    ],
    correctIndex: 0,
    explanation: "Context fixes which sense of a word is active in the clip.",
  });

  mcq.push({
    questionType: "multiple_choice",
    id: "v2",
    category: "vocabulary",
    question: "Which collocation sounds natural for formal workplace English?",
    options: [
      "We need to meet the deadline.",
      "We need meet the deadline.",
      "We needing meet the deadline.",
      "We meets the deadline.",
    ],
    correctIndex: 0,
    explanation: "Subject + need + to-infinitive is the standard pattern.",
  });

  mcq.push({
    questionType: "multiple_choice",
    id: "v3",
    category: "vocabulary",
    question:
      ctx.vocabularyTerms.length > 0
        ? `Your study list includes “${ctx.vocabularyTerms[0]}”. What does focused practice with that term in the clip help?`
        : "What does chunking phrases help you notice?",
    options: [
      "How words group with neighbours in fluent speech",
      "Video file size",
      "Screen resolution",
      "Nothing",
    ],
    correctIndex: 0,
    explanation: "Collocation and chunking support listening and production.",
  });

  mcq.push(
    grammarWeak
      ? {
          questionType: "multiple_choice" as const,
          id: "g1",
          category: "grammar" as const,
          question: `Grammar recap (“${grammarWeak.stemSnippet.slice(0, 100)}…”): Which sentence is fully correct?`,
          options: [
            "I have finished the video and noted two useful phrases.",
            "I have finish the video and noted two useful phrases.",
            "I am finished the video and noted two useful phrases.",
            "I finishing the video and noted two useful phrases.",
          ],
          correctIndex: 0,
          explanation: "Present perfect + past participle marks a completed experience.",
        }
      : {
          questionType: "multiple_choice" as const,
          id: "g1",
          category: "grammar" as const,
          question: "Which sentence is correct for a finished experience?",
          options: [
            "I have watched the video and learned a few new phrases.",
            "I have watch the video and learned a few new phrases.",
            "I has watched the video and learned a few new phrases.",
            "I watching the video and learned a few new phrases.",
          ],
          correctIndex: 0,
          explanation: "Use have + past participle for present perfect.",
        },
  );

  mcq.push({
    questionType: "multiple_choice",
    id: "g2",
    category: "grammar",
    question: "Choose the article: “I saw ___ interesting point in the video.”",
    options: ["an", "a", "the", "— (no article)"],
    correctIndex: 0,
    explanation: "“An” precedes vowel sounds (an interesting…).",
  });

  mcq.push({
    questionType: "multiple_choice",
    id: "g3",
    category: "grammar",
    question:
      "Which completes: “The speaker focuses ___ helping learners with listening.”",
    options: ["on", "at", "for", "by"],
    correctIndex: 0,
    explanation: "“Focus on” is the fixed collocation.",
  });

  const hobbyRef =
    ctx.hobbies && ctx.hobbies.length > 0
      ? ` If it fits the content, note one idea that could matter for an interest like ${ctx.hobbies
          .slice(0, 2)
          .join(" or ")
          .slice(0, 80)}.`
      : "";
  const openItem: ComprehensionTestItem = {
    questionType: "open",
    id: "open1",
    category: "open",
    question: `In 2–3 sentences, what was the video “${label.slice(0, 72)}” mainly about? Mention at least one concrete idea.${hobbyRef}`,
    explanation: `Rubric: topic + one specific detail from the clip; optional one-line link to "${goal.slice(0, 60)}" only if the video actually supports it.`,
  };

  return [...mcq, openItem];
}
