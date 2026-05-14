import type { UserData } from "../context/UserContext";
import { formatMessage } from "./formatMessage";

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

/** Match backend `studying-plan-phase-progress.util` (for UI copy). */
export const DISTINCT_PASSED_LESSONS_PER_PHASE_STEP = 2;

export const STUDYING_PLAN_JSON_VERSION = 2 as const;

const ALLOWED_TASK_KINDS = [
  "distinct_videos_passed",
  "streak_days",
  "vocabulary_terms_added",
  "watch_time_minutes",
  "min_phase_calendar_days",
] as const;

export type PlanTaskKind = (typeof ALLOWED_TASK_KINDS)[number];

export type PlanTaskDistinctVideosPassed = {
  id: string;
  kind: "distinct_videos_passed";
  minCount: number;
  minScorePct: number;
  scope: "phase" | "cumulative";
};

export type PlanTaskStreakDays = {
  id: string;
  kind: "streak_days";
  minConsecutive: number;
};

export type PlanTaskVocabularyTermsAdded = {
  id: string;
  kind: "vocabulary_terms_added";
  minCount: number;
  scope: "phase";
};

export type PlanTaskWatchTimeMinutes = {
  id: string;
  kind: "watch_time_minutes";
  minMinutes: number;
  scope: "phase";
};

export type PlanTaskMinPhaseCalendarDays = {
  id: string;
  kind: "min_phase_calendar_days";
  minDays: number;
};

export type PlanTask =
  | PlanTaskDistinctVideosPassed
  | PlanTaskStreakDays
  | PlanTaskVocabularyTermsAdded
  | PlanTaskWatchTimeMinutes
  | PlanTaskMinPhaseCalendarDays;

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function parsePlanTask(raw: unknown): PlanTask | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id.trim().slice(0, 128) : "";
  const kind = raw.kind;
  if (!id || typeof kind !== "string") return null;
  if (!ALLOWED_TASK_KINDS.includes(kind as PlanTaskKind)) return null;
  if (kind === "distinct_videos_passed") {
    const minCount = Number(raw.minCount);
    const minScorePct = Number(raw.minScorePct);
    const scope = raw.scope;
    if (
      !Number.isFinite(minCount) ||
      minCount < 1 ||
      !Number.isFinite(minScorePct) ||
      minScorePct < 0 ||
      minScorePct > 100 ||
      (scope !== "phase" && scope !== "cumulative")
    ) {
      return null;
    }
    return {
      id,
      kind: "distinct_videos_passed",
      minCount: Math.floor(minCount),
      minScorePct,
      scope,
    };
  }
  if (kind === "streak_days") {
    const minConsecutive = Number(raw.minConsecutive);
    if (!Number.isFinite(minConsecutive) || minConsecutive < 1) return null;
    return {
      id,
      kind: "streak_days",
      minConsecutive: Math.floor(minConsecutive),
    };
  }
  if (kind === "vocabulary_terms_added") {
    const minCount = Number(raw.minCount);
    if (
      !Number.isFinite(minCount) ||
      minCount < 1 ||
      raw.scope !== "phase"
    ) {
      return null;
    }
    return {
      id,
      kind: "vocabulary_terms_added",
      minCount: Math.floor(minCount),
      scope: "phase",
    };
  }
  if (kind === "watch_time_minutes") {
    const minMinutes = Number(raw.minMinutes);
    if (
      !Number.isFinite(minMinutes) ||
      minMinutes < 1 ||
      raw.scope !== "phase"
    ) {
      return null;
    }
    return {
      id,
      kind: "watch_time_minutes",
      minMinutes: Math.floor(minMinutes),
      scope: "phase",
    };
  }
  if (kind === "min_phase_calendar_days") {
    const minDays = Number(raw.minDays);
    if (!Number.isFinite(minDays) || minDays < 1) return null;
    return {
      id,
      kind: "min_phase_calendar_days",
      minDays: Math.floor(minDays),
    };
  }
  return null;
}

function parsePhaseV2(raw: unknown, _phaseIndex: number): {
  title: string;
  summary: string;
  actions: string[];
  tasks: PlanTask[];
  passConditions?: string[];
} | null {
  if (!isRecord(raw)) return null;
  const title =
    typeof raw.title === "string" ? raw.title.trim().slice(0, 220) : "";
  const summary =
    typeof raw.summary === "string" ? raw.summary.trim().slice(0, 2000) : "";
  if (title.length < 2 || summary.length < 4) return null;
  const actions: string[] = [];
  if (Array.isArray(raw.actions)) {
    for (const a of raw.actions) {
      if (typeof a !== "string") continue;
      const s = a.trim().slice(0, 2000);
      if (s.length > 0) actions.push(s);
    }
  }
  if (actions.length === 0) return null;
  if (!Array.isArray(raw.tasks) || raw.tasks.length === 0) return null;
  const tasks: PlanTask[] = [];
  for (const t of raw.tasks) {
    const pt = parsePlanTask(t);
    if (!pt) return null;
    tasks.push(pt);
  }
  let passConditions: string[] | undefined;
  if (Array.isArray(raw.passConditions)) {
    const pc = raw.passConditions
      .filter((x): x is string => typeof x === "string")
      .map((s) => s.trim().slice(0, 2000))
      .filter((s) => s.length > 0);
    passConditions = pc.length > 0 ? pc : undefined;
  }
  return { title, summary, actions, tasks, passConditions };
}

/** v2 only; returns null if missing or invalid. */
export function parseStudyingPlanV2OrNull(
  raw: unknown,
): {
  version: typeof STUDYING_PLAN_JSON_VERSION;
  phases: Array<{
    title: string;
    summary: string;
    actions: string[];
    tasks: PlanTask[];
    passConditions?: string[];
  }>;
  weeklyHabits: string[];
} | null {
  if (!isRecord(raw) || raw.version !== STUDYING_PLAN_JSON_VERSION) {
    return null;
  }
  if (!Array.isArray(raw.phases) || raw.phases.length === 0) return null;
  const phases = [];
  let i = 0;
  for (const p of raw.phases) {
    const ph = parsePhaseV2(p, i);
    if (!ph) return null;
    phases.push(ph);
    i += 1;
  }
  if (!Array.isArray(raw.weeklyHabits) || raw.weeklyHabits.length === 0) {
    return null;
  }
  const weeklyHabits = raw.weeklyHabits
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim().slice(0, 500))
    .filter((s) => s.length > 0);
  if (weeklyHabits.length === 0) return null;
  return { version: STUDYING_PLAN_JSON_VERSION, phases, weeklyHabits };
}

/** Match backend `studying-plan-horizon.util` (defaults + offline plan). */
const DEFAULT_HORIZON_DAYS = 365;
const STRUCTURED_STUDY_FRACTION = 0.9;

type HorizonBudget = {
  approxTotalDays: number;
  structuredStudyDays: number;
  approxTotalWeeks: number;
  structuredStudyWeeks: number;
  phaseMinDays: [number, number, number, number];
  phaseMinWeeks: [number, number, number, number];
};

type CoarseLevelTier =
  | "beginner"
  | "elementary"
  | "intermediate"
  | "advanced";

function roundWeeksFromDays(days: number): number {
  return Math.max(1, Math.round(days / 7));
}

function approximateHorizonDaysForUi(label: string): number {
  const raw = label.trim().toLowerCase().replace(/\s+/g, " ");
  if (!raw) return DEFAULT_HORIZON_DAYS;
  const halfYear =
    /\bhalf\s*a\s*year\b/.test(raw) ||
    /\b6\s*months\b/.test(raw) ||
    /\bsix\s*months\b/.test(raw);
  if (halfYear) return 183;
  const numMatch = raw.match(/(\d+(?:\.\d+)?)/);
  const n = numMatch ? Math.max(0.25, parseFloat(numMatch[1])) : 1;
  if (/\byears?\b|\byrs?\b/.test(raw)) return Math.round(n * 365);
  if (/\bmonths?\b|\bmos?\b/.test(raw)) return Math.round(n * 30.44);
  if (/\bweeks?\b|\bwks?\b/.test(raw)) return Math.round(n * 7);
  if (/\bdays?\b/.test(raw)) return Math.round(n);
  if (/^\d+(\.\d+)?\s*y$/.test(raw)) return Math.round(n * 365);
  if (/^\d+(\.\d+)?\s*m$/.test(raw)) return Math.round(n * 30.44);
  if (/^\d+(\.\d+)?\s*w$/.test(raw)) return Math.round(n * 7);
  if (/\bquarter\b/.test(raw)) return 91;
  return DEFAULT_HORIZON_DAYS;
}

function splitStructuredDaysAcrossPhases(
  n: number,
): [number, number, number, number] {
  if (n <= 0) return [1, 1, 1, 1];
  if (n < 4) {
    const out: [number, number, number, number] = [0, 0, 0, 0];
    for (let i = 0; i < n; i++) out[i] = 1;
    return out;
  }
  const w: [number, number, number, number] = [0.22, 0.24, 0.26, 0.28];
  const floors = w.map((wi) => Math.floor(n * wi));
  let assigned = floors.reduce((a, b) => a + b, 0);
  let rem = n - assigned;
  const out = [...floors] as [number, number, number, number];
  for (let i = 3; i >= 0 && rem > 0; i--) {
    out[i] += 1;
    rem -= 1;
  }
  return out;
}

function phaseWeeksFromDaysMin(days: number): number {
  if (days <= 0) return 1;
  if (days < 10) return 1;
  return Math.max(1, Math.round(days / 7));
}

function horizonBudgetFromLabel(label: string): HorizonBudget {
  const approxTotalDays = Math.max(1, approximateHorizonDaysForUi(label));
  const structuredStudyDays = Math.max(
    1,
    Math.round(approxTotalDays * STRUCTURED_STUDY_FRACTION),
  );
  const approxTotalWeeks = roundWeeksFromDays(approxTotalDays);
  const structuredStudyWeeks = roundWeeksFromDays(structuredStudyDays);
  const phaseMinDays = splitStructuredDaysAcrossPhases(structuredStudyDays);
  const phaseMinWeeks: [number, number, number, number] = [
    phaseWeeksFromDaysMin(phaseMinDays[0]),
    phaseWeeksFromDaysMin(phaseMinDays[1]),
    phaseWeeksFromDaysMin(phaseMinDays[2]),
    phaseWeeksFromDaysMin(phaseMinDays[3]),
  ];
  return {
    approxTotalDays,
    structuredStudyDays,
    approxTotalWeeks,
    structuredStudyWeeks,
    phaseMinDays,
    phaseMinWeeks,
  };
}

function coarseLevelTierFromProfile(englishLevel: string): CoarseLevelTier {
  const s = englishLevel.toLowerCase();
  if (/c2|\bproficiency\b|\bproficient\b|\bmastery\b|\bnative\b/.test(s)) {
    return "advanced";
  }
  if (/c1/.test(s)) return "advanced";
  if (/b2|upper.intermediate|upper-intermediate|vantage/.test(s)) {
    return "intermediate";
  }
  if (/b1|threshold/.test(s)) return "intermediate";
  if (/a2|elementary|pre-intermediate|preintermediate/.test(s)) {
    return "elementary";
  }
  if (/a1|beginner|starter|basic/.test(s)) return "beginner";
  return "beginner";
}

const VOCAB_BY_TIER: Record<CoarseLevelTier, [number, number, number, number]> =
  {
    beginner: [15, 22, 30, 40],
    elementary: [20, 30, 45, 60],
    intermediate: [28, 40, 55, 75],
    advanced: [35, 50, 70, 90],
  };

function vocabularyTargetForPhaseUi(
  tier: CoarseLevelTier,
  phaseIndex: number,
): number {
  return VOCAB_BY_TIER[tier][Math.min(3, Math.max(0, phaseIndex))];
}

function streakTargetForPhaseUi(
  phaseIndex: number,
  structuredStudyWeeks: number,
): number {
  const relaxed = structuredStudyWeeks < 6;
  const caps = relaxed ? [5, 6, 7, 7] : [7, 10, 14, 21];
  return caps[Math.min(3, Math.max(0, phaseIndex))];
}

function videosPassedPlanTargetForPhaseUi(phaseIndex: number): number {
  return Math.max(3, 2 + phaseIndex * 2);
}

function buildPlanTasksForPhaseUi(options: {
  phaseIndex: number;
  budget: HorizonBudget;
  tier: CoarseLevelTier;
}): PlanTask[] {
  const { phaseIndex, budget, tier } = options;
  const streak = streakTargetForPhaseUi(phaseIndex, budget.structuredStudyWeeks);
  const videos = videosPassedPlanTargetForPhaseUi(phaseIndex);
  const words = vocabularyTargetForPhaseUi(tier, phaseIndex);
  const minPhaseDays = Math.max(1, budget.phaseMinDays[phaseIndex]);
  const watchMinutes = 45 + phaseIndex * 45;
  const idx = phaseIndex;
  return [
    {
      id: `p${idx}-videos-passed`,
      kind: "distinct_videos_passed",
      minCount: videos,
      minScorePct: 70,
      scope: "phase",
    },
    {
      id: `p${idx}-streak`,
      kind: "streak_days",
      minConsecutive: streak,
    },
    {
      id: `p${idx}-vocab`,
      kind: "vocabulary_terms_added",
      minCount: words,
      scope: "phase",
    },
    {
      id: `p${idx}-watch`,
      kind: "watch_time_minutes",
      minMinutes: watchMinutes,
      scope: "phase",
    },
    {
      id: `p${idx}-calendar`,
      kind: "min_phase_calendar_days",
      minDays: minPhaseDays,
    },
  ];
}

function richPassConditionsForPhaseUi(options: {
  phaseIndex: number;
  budget: HorizonBudget;
  tier: CoarseLevelTier;
  learningGoal: string;
}): string[] {
  const { phaseIndex, budget, tier, learningGoal } = options;
  const base = standardPhasePassConditionLines();
  const streak = streakTargetForPhaseUi(phaseIndex, budget.structuredStudyWeeks);
  const videos = videosPassedPlanTargetForPhaseUi(phaseIndex);
  const words = vocabularyTargetForPhaseUi(tier, phaseIndex);
  const out = [...base];
  out.push(
    `Reach a **${streak}-day** study streak at least once (each day with meaningful catalog practice counts).`,
    `Pass **at least ${videos}** distinct videos at **≥70%** on comprehension checks (the app advances after **${DISTINCT_PASSED_LESSONS_PER_PHASE_STEP}** distinct passes — treat **${videos}** as your depth target for this phase).`,
    `Learn or consolidate **~${words}** new words from lessons (saved words + reviews in the app).`,
    `Keep clip and quiz choices aligned with your goal: **${learningGoal}**.`,
  );
  return out;
}

/** Hides calendar / phase-duration lines from learner-facing “To complete this phase” (pacing stays in structured tasks only). */
export function passConditionsForDisplay(lines: string[]): string[] {
  return lines.filter((line) => !shouldHideCalendarSpanPassConditionLine(line));
}

function shouldHideCalendarSpanPassConditionLine(line: string): boolean {
  const t = line.trim();
  if (/plan on \*\*at least/i.test(t) || /\bplan on\s+\*\*at least/i.test(t)) {
    return true;
  }
  if (/structured window/i.test(t)) return true;
  if (/across all four phases/i.test(t) && /90%/i.test(t)) return true;
  if (/stated horizon/i.test(t) && /90%/i.test(t) && /\b(full|roadmap)\b/i.test(t)) {
    return true;
  }
  if (/minimum\s+(calendar|phase)\s+(span|duration)/i.test(t)) return true;
  if (
    /\bin this phase\b/i.test(t) &&
    /(\d+\s*\*\*)?\s*weeks?\s*\(/i.test(t) &&
    /goal horizon/i.test(t)
  ) {
    return true;
  }
  return false;
}

/** Align with backend `standardPhasePassConditionLines` when JSON omits them. */
export function standardPhasePassConditionLines(): string[] {
  return [
    `Complete comprehension checks at 70% or above on ${DISTINCT_PASSED_LESSONS_PER_PHASE_STEP} distinct catalog videos (each video counts once when passed).`,
    "Finish the full lesson for each video—including multiple-choice and the short summary question when present.",
  ];
}

export type LearningPlanPhase = {
  title: string;
  summary: string;
  actions: string[];
  tasks: PlanTask[];
  /** Human-readable checklist; may mirror tasks. */
  passConditions: string[];
};

export type LearningPlanModel = {
  goal: string;
  horizon: string;
  headline: string;
  intro: string;
  phases: LearningPlanPhase[];
  /** Mirrors server index; always in range for `phases.length`. */
  activePhaseIndex: number;
  weeklyHabits: string[];
};

/** Template strings for “To complete this phase” when using localized defaults. */
export type LocalizedPhasePassLines = {
  completeVideos: string;
  finishLesson: string;
  streak: string;
  videoDepth: string;
  vocab: string;
  goalAlign: string;
};

export type LocalizedDefaultPhaseCard = {
  title: string;
  summary: string;
  actions: readonly [string, string, string];
};

export type LocalizedDefaultPhasesCopy = {
  phases: readonly [
    LocalizedDefaultPhaseCard,
    LocalizedDefaultPhaseCard,
    LocalizedDefaultPhaseCard,
    LocalizedDefaultPhaseCard,
  ];
  passLines: LocalizedPhasePassLines;
  weeklyHabits?: readonly [string, string, string];
};

function localizedWeeklyHabitsFromTemplates(
  user: UserData,
  templates: readonly [string, string, string],
): string[] {
  const budget = horizonBudgetFromLabel(
    effectiveTimeHorizon(user.timeToAchieve),
  );
  const sessions = String(
    Math.max(2, Math.round(budget.structuredStudyWeeks / 6)),
  );
  const weeks = String(budget.structuredStudyWeeks);
  return [
    formatMessage(templates[0], { sessions, weeks }),
    formatMessage(templates[1], {}),
    formatMessage(templates[2], {}),
  ];
}

function richPassConditionsForPhaseUiLocalized(
  options: {
    phaseIndex: number;
    budget: HorizonBudget;
    tier: CoarseLevelTier;
    learningGoal: string;
  },
  lines: LocalizedPhasePassLines,
): string[] {
  const { phaseIndex, budget, tier, learningGoal } = options;
  const streak = streakTargetForPhaseUi(phaseIndex, budget.structuredStudyWeeks);
  const videos = videosPassedPlanTargetForPhaseUi(phaseIndex);
  const words = vocabularyTargetForPhaseUi(tier, phaseIndex);
  const distinct = DISTINCT_PASSED_LESSONS_PER_PHASE_STEP;
  return [
    formatMessage(lines.completeVideos, { count: String(distinct) }),
    lines.finishLesson,
    formatMessage(lines.streak, { streak: String(streak) }),
    formatMessage(lines.videoDepth, {
      videos: String(videos),
      distinct: String(distinct),
    }),
    formatMessage(lines.vocab, { words: String(words) }),
    formatMessage(lines.goalAlign, { learningGoal }),
  ];
}

function buildDefaultPhasesFromCopy(
  user: UserData,
  copy: LocalizedDefaultPhasesCopy,
): LearningPlanPhase[] {
  const goal = effectiveLearningGoal(user.learningGoal);
  const horizon = effectiveTimeHorizon(user.timeToAchieve);
  const budget = horizonBudgetFromLabel(horizon);
  const levelRaw =
    user.englishLevel?.trim() && user.englishLevel !== "choose" ?
      user.englishLevel.trim()
    : "";
  const tier = coarseLevelTierFromProfile(levelRaw);
  const vars = { horizon, learningGoal: goal };
  return [0, 1, 2, 3].map((phaseIndex) => {
    const card = copy.phases[phaseIndex];
    const title = formatMessage(card.title, vars);
    const summary = formatMessage(card.summary, vars);
    const actions = card.actions.map((a) => formatMessage(a, vars));
    return {
      title,
      summary,
      actions,
      passConditions: richPassConditionsForPhaseUiLocalized(
        { phaseIndex, budget, tier, learningGoal: goal },
        copy.passLines,
      ),
      tasks: buildPlanTasksForPhaseUi({ phaseIndex, budget, tier }),
    };
  });
}

export function weeklyHabitsFromStoredStudyingPlanJson(
  raw: unknown,
): string[] | null {
  const plan = parseStudyingPlanV2OrNull(raw);
  return plan ? plan.weeklyHabits : null;
}

export function defaultWeeklyHabits(): string[] {
  const budget = horizonBudgetFromLabel(DEFAULT_TIME_HORIZON);
  return [
    `At least **${Math.max(2, Math.round(budget.structuredStudyWeeks / 6))}** catalog sessions with quizzes completed each week.`,
    "One session reviewing vocabulary or transcripts from the past week.",
    "One “stretch” video slightly above your easiest comfortable pick.",
  ];
}

function defaultWeeklyHabitsForUser(user: UserData): string[] {
  const budget = horizonBudgetFromLabel(effectiveTimeHorizon(user.timeToAchieve));
  return [
    `At least **${Math.max(2, Math.round(budget.structuredStudyWeeks / 6))}** catalog sessions with quizzes each week (fits your **~${budget.structuredStudyWeeks}-week** structured window, about **90%** of your horizon).`,
    "One vocabulary or transcript review session from last week’s lessons.",
    "One stretch video slightly above your easiest comfortable pick.",
  ];
}

export function parseStudyingPlanPhases(raw: unknown): LearningPlanPhase[] | null {
  const plan = parseStudyingPlanV2OrNull(raw);
  if (!plan) return null;
  const fallbackPass = standardPhasePassConditionLines();
  return plan.phases.map((p) => ({
    title: p.title,
    summary: p.summary,
    actions: p.actions,
    tasks: p.tasks,
    passConditions:
      p.passConditions && p.passConditions.length > 0 ?
        p.passConditions
      : [...fallbackPass],
  }));
}

/** Default phases when `studyingPlanPhases` is not stored yet. */
export function buildDefaultPhasesForUser(
  user: UserData,
  copy?: LocalizedDefaultPhasesCopy,
): LearningPlanPhase[] {
  if (copy) {
    return buildDefaultPhasesFromCopy(user, copy);
  }
  const goal = effectiveLearningGoal(user.learningGoal);
  const horizon = effectiveTimeHorizon(user.timeToAchieve);
  const budget = horizonBudgetFromLabel(horizon);
  const levelRaw =
    user.englishLevel?.trim() && user.englishLevel !== "choose" ?
      user.englishLevel.trim()
    : "";
  const tier = coarseLevelTierFromProfile(levelRaw);
  return [
    {
      title: "Phase 1 — Build the habit",
      summary: "Turn English into a small weekly default, not a special event.",
      actions: [
        "Pick 2–3 fixed slots per week for lessons (even 20 minutes counts).",
        "Start with videos tagged near your level; finish the comprehension checks.",
        "Note 5 new words per week and revisit them before the next lesson.",
      ],
      passConditions: richPassConditionsForPhaseUi({
        phaseIndex: 0,
        budget,
        tier,
        learningGoal: goal,
      }),
      tasks: buildPlanTasksForPhaseUi({ phaseIndex: 0, budget, tier }),
    },
    {
      title: "Phase 2 — Stretch input",
      summary: "Widen topics and difficulty so your goal stays realistic.",
      actions: [
        "Add one genre or theme outside your comfort zone each month.",
        "Re-watch a short clip with subtitles off, then with subtitles — compare what you missed.",
        `Tie clips to your aim (${goal}): pick content where people do what you’ll need in real life.`,
      ],
      passConditions: richPassConditionsForPhaseUi({
        phaseIndex: 1,
        budget,
        tier,
        learningGoal: goal,
      }),
      tasks: buildPlanTasksForPhaseUi({ phaseIndex: 1, budget, tier }),
    },
    {
      title: "Phase 3 — Apply and check",
      summary: "Connect input to output so progress shows up where it matters.",
      actions: [
        "After each lesson, say or write 3 sentences summarizing it in English.",
        "Monthly: redo one older quiz or lesson to confirm retention.",
        "Adjust your path if quizzes feel too easy for two weeks — level up slightly.",
      ],
      passConditions: richPassConditionsForPhaseUi({
        phaseIndex: 2,
        budget,
        tier,
        learningGoal: goal,
      }),
      tasks: buildPlanTasksForPhaseUi({ phaseIndex: 2, budget, tier }),
    },
    {
      title: "Phase 4 — Sustain through the horizon",
      summary: `Keep gains through ${horizon} with light structure.`,
      actions: [
        "Maintain a minimum weekly watch time even on busy weeks.",
        "Prefer depth (finishing levels of content) over random browsing.",
        "Refresh your goal text in settings if life changes — plans should stay honest.",
      ],
      passConditions: richPassConditionsForPhaseUi({
        phaseIndex: 3,
        budget,
        tier,
        learningGoal: goal,
      }),
      tasks: buildPlanTasksForPhaseUi({ phaseIndex: 3, budget, tier }),
    },
  ];
}

export function resolvePhasesForUser(
  user: UserData,
  copy?: LocalizedDefaultPhasesCopy,
): LearningPlanPhase[] {
  const parsed = parseStudyingPlanPhases(user.studyingPlanPhases);
  if (parsed) return parsed;
  return buildDefaultPhasesForUser(user, copy);
}

function clampPhaseIndex(index: number, phaseCount: number): number {
  if (phaseCount <= 0) return 0;
  return Math.max(0, Math.min(Math.floor(index), phaseCount - 1));
}

/**
 * Builds a template learning plan from profile + resolved goal/horizon.
 * Uses saved `studyingPlanPhases` JSON when present; otherwise default phases.
 */
export function buildLearningPlanModel(
  user: UserData,
  copy?: LocalizedDefaultPhasesCopy,
): LearningPlanModel {
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

  const phases = resolvePhasesForUser(user, copy);
  /** From API: derived from distinct videos with passing quiz (not user-editable). */
  const storedIndex =
    user.activeStudyingPhaseIndex != null &&
    Number.isFinite(Number(user.activeStudyingPhaseIndex)) ?
      Number(user.activeStudyingPhaseIndex)
    : 0;
  const activePhaseIndex = clampPhaseIndex(storedIndex, phases.length);

  const storedWeekly = weeklyHabitsFromStoredStudyingPlanJson(
    user.studyingPlanPhases,
  );
  const weeklyHabits =
    storedWeekly ??
    (copy?.weeklyHabits ?
      localizedWeeklyHabitsFromTemplates(user, copy.weeklyHabits)
    : defaultWeeklyHabitsForUser(user));

  return {
    goal,
    horizon,
    headline: `Plan for the next ${horizon}`,
    intro: `Your focus: **${goal}**. Over **${horizon}**, steady practice beats occasional marathons. The catalog adapts to **${level}**; use it consistently and you’ll see listening, vocabulary, and grammar reinforce each other.${hobbyLine}`,
    phases,
    activePhaseIndex,
    weeklyHabits,
  };
}
