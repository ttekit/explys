import type {
  VocabularyItem,
  QuizQuestion,
} from "../../content-watch/defaultLessonSides";

export interface DemoLessonData {
  videoLink: string;
  videoName: string;
  videoDescription: string;
  subtitlesFileLink: string;
  subtitlesFileLinkUk?: string;
  vocabulary: VocabularyItem[];
  quizQuestions: QuizQuestion[];
  maxPlaybackSec?: number;
}

const HARRY_POTTER_VIDEO =
  "https://kpi-eng-course.s3.amazonaws.com/m3u8_videos/HarryPotter_f4c24494-8416-41ce-ad6b-e2961576f5fe/index.m3u8";
const HARRY_POTTER_VTT =
  "https://kpi-eng-course.s3.amazonaws.com/uploads/captions/c8e3111e-020c-4f86-8f63-655751d5f10f.vtt";

const HARRY_POTTER_VIDEO_QUICK =
  "https://kpi-eng-course.s3.us-east-1.amazonaws.com/m3u8_videos/%D0%93%D0%B0%D1%80%D1%80%D0%B8_%D0%9F%D0%BE%D1%82%D1%82%D0%B5%D1%80_%D0%B8_%D0%A4%D0%B8%D0%BB%D0%BE%D1%81%D0%BE%D1%84%D1%81%D0%BA%D0%B8%D0%B8%CC%86_%D0%9A%D0%B0%D0%BC%D0%B5%D0%BD%D1%8C_1/index.m3u8";

const sharedVocabularyQuick: VocabularyItem[] = [
  {
    word: "Peppermint",
    meaning:
      "A strong fresh flavouring from a type of mint plant, used especially to give flavour to sweets",
    pronunciation: "pep.ə.mɪnt",
  },
  {
    word: "Spinach",
    meaning:
      "A vegetable with wide, dark green leaves that are eaten cooked or uncooked",
    pronunciation: "spɪn.ɪtʃ",
  },
  {
    word: "Toad",
    meaning:
      "A small, brown animal, similar to a frog, that has big eyes and long back legs for swimming and jumping",
    pronunciation: "təʊd",
  },
  {
    word: "Robe",
    meaning:
      "A long, loose piece of clothing worn especially on very formal occasions",
    pronunciation: "rəʊb",
  },
];

const sharedVocabularyWhole: VocabularyItem[] = [
  {
    word: "Peppermint",
    meaning:
      "A strong fresh flavouring from a type of mint plant, used especially to give flavour to sweets",
    pronunciation: "pep.ə.mɪnt",
  },
  {
    word: "Spinach",
    meaning:
      "A vegetable with wide, dark green leaves that are eaten cooked or uncooked",
    pronunciation: "spɪn.ɪtʃ",
  },
  {
    word: "Toad",
    meaning:
      "A small, brown animal, similar to a frog, that has big eyes and long back legs for swimming and jumping",
    pronunciation: "təʊd",
  },
  {
    word: "Robe",
    meaning:
      "A long, loose piece of clothing worn especially on very formal occasions",
    pronunciation: "rəʊb",
  },
  {
    word: "Bewitched",
    meaning:
      "Extremely attracted to something, or completely controlled by something",
    pronunciation: "bɪˈwɪtʃt",
  },
  {
    word: "Poison",
    meaning:
      "A substance that can make people or animals ill or kill them if they eat or drink it",
    pronunciation: "ˈpɔɪ.zən",
  },
  {
    word: "Dismal",
    meaning: "Sad and without hope",
    pronunciation: "ˈdɪz.məl",
  },
  {
    word: "Announcement",
    meaning:
      "Something that someone says officially, giving information about something",
    pronunciation: "əˈnaʊns.mənt",
  },
];

const sharedQuizQuestions: QuizQuestion[] = [
  {
    id: "demo_q1",
    timestamp: "0:30",
    question:
      "Choose the correct past tense form to complete the sentence: 'Harry _____ (be) surprised when he met Ron on the train.'",
    options: ["Is", "Was", "Were", "Been"],
    correct: 1,
    category: "grammar",
  },
  {
    id: "demo_q2",
    timestamp: "1:00",
    question:
      "Which sentence correctly uses the comparative form to describe the wizarding families?",
    options: [
      "Some families are gooder than others.",
      "Some families are more good than others.",
      "Some families are better than others.",
      "Some families are best than others.",
    ],
    correct: 2,
    category: "grammar",
  },
  {
    id: "demo_q3",
    timestamp: "1:30",
    question:
      "Identify the correct modal verb usage: 'You ______ change into your robes before arriving at Hogwarts.'",
    options: ["better", "had better", "should to", "musting"],
    correct: 1,
    category: "grammar",
  },
  {
    id: "demo_q4",
    timestamp: "1:30",
    question:
      "Which sentence correctly uses the past tense to describe Harry's arrival at Hogwarts?",
    options: [
      "Harry arrive at Hogwarts and meet Ron",
      "Harry arrived at Hogwarts and met Ron.",
      "Harry arrives at Hogwarts and meeting Ron.",
      "Harry was arrive at Hogwarts and meeted Ron.",
    ],
    correct: 1,
    category: "grammar",
  },
];

export const demoLessons: Record<"quickTry" | "wholeLesson", DemoLessonData> = {
  quickTry: {
    videoLink: HARRY_POTTER_VIDEO_QUICK,
    videoName: "The Philosopher's Stone (Ep.1) — Quick Try",
    videoDescription:
      "A short taste of the lesson. Watch the first couple of minutes and try a mini quiz.",
    subtitlesFileLink: HARRY_POTTER_VTT,
    subtitlesFileLinkUk: "/harry-potter-uk.vtt",
    vocabulary: sharedVocabularyQuick,
    quizQuestions: sharedQuizQuestions,
    maxPlaybackSec: 207,
  },
  wholeLesson: {
    videoLink: HARRY_POTTER_VIDEO,
    videoName: "The Philosopher's Stone (Ep.1)",
    videoDescription:
      "Start your language journey with a magical classic. Through clear dialogues and a heartwarming story, you will learn how to describe people and places, express basic emotions, and easily catch natural British accents without feeling overwhelmed.",
    subtitlesFileLink: HARRY_POTTER_VTT,
    subtitlesFileLinkUk: "/harry-potter-uk.vtt",
    vocabulary: sharedVocabularyWhole,
    quizQuestions: sharedQuizQuestions,
    maxPlaybackSec: undefined,
  },
};
