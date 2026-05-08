import type { UserData } from "../context/UserContext";

/** Used when the learner did not set a custom goal during registration. */
export const DEFAULT_LEARNING_GOAL = "Improve language";

/** Used when the learner did not set a time horizon during registration. */
export const DEFAULT_TIME_HORIZON = "1 year";

export function effectiveLearningGoal(
  learningGoal: string | undefined | null,
): string {
  const t = learningGoal?.trim();
  return t && t.length > 0 ? t : DEFAULT_LEARNING_GOAL;
}

export function effectiveTimeHorizon(
  timeToAchieve: string | undefined | null,
): string {
  const t = timeToAchieve?.trim();
  return t && t.length > 0 ? t : DEFAULT_TIME_HORIZON;
}

export type LearningPlanPhase = {
  title: string;
  summary: string;
  actions: string[];
};

export type LearningPlanModel = {
  goal: string;
  horizon: string;
  headline: string;
  intro: string;
  phases: LearningPlanPhase[];
  weeklyHabits: string[];
};

/**
 * Builds a template learning plan from profile + resolved goal/horizon.
 * Copy is generic but references the learner’s goal and level where useful.
 */
export function buildLearningPlanModel(user: UserData): LearningPlanModel {
  const goal = effectiveLearningGoal(user.learningGoal);
  const horizon = effectiveTimeHorizon(user.timeToAchieve);
  const level =
    user.englishLevel?.trim() && user.englishLevel !== "choose" ?
      user.englishLevel.trim()
    : "your current level";

  const hobbyLine =
    user.hobbies && user.hobbies.length > 0 ?
      ` Lean on interests like ${user.hobbies.slice(0, 3).join(", ")} when choosing videos — motivation matters as much as minutes watched.`
    : "";

  return {
    goal,
    horizon,
    headline: `Plan for the next ${horizon}`,
    intro: `Your focus: **${goal}**. Over **${horizon}**, steady practice beats occasional marathons. The catalog adapts to **${level}**; use it consistently and you’ll see listening, vocabulary, and grammar reinforce each other.${hobbyLine}`,
    phases: [
      {
        title: "Phase 1 — Build the habit",
        summary: "Turn English into a small weekly default, not a special event.",
        actions: [
          "Pick 2–3 fixed slots per week for lessons (even 20 minutes counts).",
          "Start with videos tagged near your level; finish the comprehension checks.",
          "Note 5 new words per week and revisit them before the next lesson.",
        ],
      },
      {
        title: "Phase 2 — Stretch input",
        summary: "Widen topics and difficulty so your goal stays realistic.",
        actions: [
          "Add one genre or theme outside your comfort zone each month.",
          "Re-watch a short clip with subtitles off, then with subtitles — compare what you missed.",
          `Tie clips to your aim (${goal}): pick content where people do what you’ll need in real life.`,
        ],
      },
      {
        title: "Phase 3 — Apply and check",
        summary: "Connect input to output so progress shows up where it matters.",
        actions: [
          "After each lesson, say or write 3 sentences summarizing it in English.",
          "Monthly: redo one older quiz or lesson to confirm retention.",
          "Adjust your path if quizzes feel too easy for two weeks — level up slightly.",
        ],
      },
      {
        title: "Phase 4 — Sustain through the horizon",
        summary: `Keep gains through ${horizon} with light structure.`,
        actions: [
          "Maintain a minimum weekly watch time even on busy weeks.",
          "Prefer depth (finishing levels of content) over random browsing.",
          "Refresh your goal text in settings if life changes — plans should stay honest.",
        ],
      },
    ],
    weeklyHabits: [
      "At least two catalog lessons with quizzes completed.",
      "One session reviewing vocabulary or transcripts from the past week.",
      "One “stretch” video slightly above your easiest comfortable pick.",
    ],
  };
}
