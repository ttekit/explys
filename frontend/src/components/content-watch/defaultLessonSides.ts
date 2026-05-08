/** Placeholder sidebar data when lesson metadata has no captions/vocab/tests yet */

export interface VocabularyItem {
  word: string;
  /** Simple English explanation of what the word means (prominent box). */
  meaning: string;
  /** Headword gloss in the learner’s native language (muted line). Filled via vocabulary-hints when possible. */
  translation?: string;
  /** English pronunciation, e.g. IPA from a dictionary (muted line). */
  pronunciation?: string;
}

export interface TranscriptLine {
  time: string;
  speaker: string;
  text: string;
  /** For sync with playback; set when sourced from captions. */
  startSec?: number;
  endSec?: number;
}

export interface QuizQuestion {
  /** Matches API test id (e.g. t1) for server submit. */
  id: string;
  timestamp: string;
  question: string;
  /** Omit or `multiple_choice` — default is MCQ for backwards compatibility. */
  questionType?: "multiple_choice" | "open";
  options: string[];
  /** Selected option index for MCQ; ignored for open-ended items. */
  correct: number;
  category?:
    | "comprehension"
    | "grammar"
    | "vocabulary"
    | "open";
  explanation?: string;
}

export const defaultVocabulary: VocabularyItem[] = [
  {
    word: "Synergy",
    meaning:
      "When parts work together so the result is stronger than each part alone.",
  },
  {
    word: "Agenda",
    meaning: "A list of things people plan to talk about in a meeting.",
  },
  {
    word: "Minutes",
    meaning: "A written record of what was said or decided in a meeting.",
  },
];

export const defaultTranscript: TranscriptLine[] = [
  {
    time: "0:00",
    speaker: "Host",
    text: "Listen for natural pacing and collocations — pause and repeat aloud.",
  },
  {
    time: "0:15",
    speaker: "Guide",
    text: "Notice how ideas connect with linking words.",
  },
];

/** Nine MCQs (grammar / vocabulary / comprehension) plus one open summary — mirrors live API shape. */
export const defaultQuizQuestions: QuizQuestion[] = [
  {
    id: "dq1",
    timestamp: "0:45",
    question: "Which sentence uses the present perfect in a typical workplace sense?",
    options: [
      "We finish the report yesterday.",
      "We have finished the report.",
      "We finishing the report.",
      "We will finished the report.",
    ],
    correct: 1,
    category: "grammar",
    explanation:
      "“Have finished” is present perfect — a past action with present relevance.",
  },
  {
    id: "dq2",
    timestamp: "1:00",
    question: "Choose the best article: “Could you send me ___ agenda for Friday?”",
    options: ["a", "an", "the", "— (zero article)"],
    correct: 2,
    category: "grammar",
    explanation:
      "Use “the” when both speakers know which specific agenda is meant.",
  },
  {
    id: "dq3",
    timestamp: "1:15",
    question: "Which form agrees with a singular subject?",
    options: [
      "The team are disagreeing.",
      "The team is aligning on next steps.",
      "The team have conflict.",
      "The team were split.",
    ],
    correct: 1,
    category: "grammar",
    explanation:
      "In formal English, collective “team” often takes a singular verb when acting as one unit.",
  },
  {
    id: "dq4",
    timestamp: "1:30",
    question: "In the phrase “circle back,” the meaning closest to workplace English is:",
    options: [
      "End the relationship",
      "Return to a topic later",
      "Draw a circle on the board",
      "Reject an idea permanently",
    ],
    correct: 1,
    category: "vocabulary",
    explanation: "“Circle back” means to discuss something again at a later time.",
  },
  {
    id: "dq5",
    timestamp: "1:45",
    question: "“Synergy” in this lesson most likely suggests:",
    options: [
      "Parts working together produce a stronger outcome",
      "A type of invoice",
      "A solo accomplishment",
      "A software bug",
    ],
    correct: 0,
    category: "vocabulary",
    explanation: "Synergy is the combined effect being greater than separate efforts.",
  },
  {
    id: "dq6",
    timestamp: "2:00",
    question: "Which phrase is a common collocation in business English?",
    options: [
      "Break in touch",
      "Stay in touch",
      "Fall in touch",
      "Lose in touch",
    ],
    correct: 1,
    category: "vocabulary",
    explanation: "We “stay in touch” — we keep contact after a meeting or project.",
  },
  {
    id: "dq7",
    timestamp: "2:10",
    question: "What is “agenda” in a meeting context?",
    options: [
      "The room layout",
      "The list of topics to discuss",
      "The dress code",
      "The coffee order",
    ],
    correct: 1,
    category: "comprehension",
    explanation: "The agenda lists what will be covered.",
  },
  {
    id: "dq8",
    timestamp: "2:25",
    question: "According to the lesson tone, what should learners practise first?",
    options: [
      "Ignoring linking words",
      "Natural pacing and repeating aloud",
      "Reading only in silence",
      "Skipping unknown words",
    ],
    correct: 1,
    category: "comprehension",
    explanation: "The transcript invites listening for pacing and repeating aloud.",
  },
  {
    id: "dq9",
    timestamp: "2:40",
    question: "Why might linking words matter in English meetings?",
    options: [
      "They replace preparation entirely",
      "They help listeners follow how ideas connect",
      "They are only decorative",
      "They shorten every sentence to one word",
    ],
    correct: 1,
    category: "comprehension",
    explanation: "Linking words signal logical connections between ideas.",
  },
  {
    id: "dq_open",
    timestamp: "3:00",
    question:
      "In 2–3 sentences, what is this lesson mainly about? Mention one concrete idea from the audio/script if you can.",
    questionType: "open",
    options: [],
    correct: 0,
    category: "open",
    explanation:
      "A strong answer names the focus on listening, collocation, meeting English, or similar themes from the clip.",
  },
];
