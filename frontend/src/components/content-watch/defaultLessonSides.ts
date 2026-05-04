/** Placeholder sidebar data when lesson metadata has no captions/vocab/tests yet */

export interface VocabularyItem {
  word: string;
  definition: string;
  example: string;
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
  id: number;
  timestamp: string;
  question: string;
  options: string[];
  correct: number;
}

export const defaultVocabulary: VocabularyItem[] = [
  {
    word: "Synergy",
    definition:
      "The interaction of parts so that the combined effect is greater than individual efforts.",
    example: "Our teams work in synergy to ship features faster.",
  },
  {
    word: "Agenda",
    definition: "A list of topics to cover in a meeting.",
    example: "The first item on today's agenda is the quarterly review.",
  },
  {
    word: "Minutes",
    definition: "A written record of a meeting.",
    example: "Could you circulate the minutes after the call?",
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

export const defaultQuizQuestions: QuizQuestion[] = [
  {
    id: 1,
    timestamp: "0:45",
    question: 'What does “synergy” most often suggest in workplace English?',
    options: [
      "Working together produces a stronger result",
      "A synonym for synergy report",
      "Only marketing tasks",
      "A payroll term",
    ],
    correct: 0,
  },
  {
    id: 2,
    timestamp: "1:30",
    question:
      'Which phrase is polite when you want to move a meeting forward?',
    options: ["Shut it down now", "Let’s circle back offline", "You’re wrong", "I quit"],
    correct: 1,
  },
  {
    id: 3,
    timestamp: "2:10",
    question: '"Agenda" in a meeting means:',
    options: [
      "The room layout",
      "The list of discussion topics",
      "The attendee dress code",
      "The projector brand",
    ],
    correct: 1,
  },
];
