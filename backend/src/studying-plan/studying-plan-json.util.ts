import { DISTINCT_PASSED_LESSONS_PER_PHASE_STEP } from "./studying-plan.constants";

/** Stored in `additional_user_data.studying_plan_phases` (JSON). */
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

export type StoredStudyingPlanPhaseV2 = {
  title: string;
  summary: string;
  actions: string[];
  tasks: PlanTask[];
  passConditions?: string[];
};

export type StoredStudyingPlanV2 = {
  version: typeof STUDYING_PLAN_JSON_VERSION;
  phases: StoredStudyingPlanPhaseV2[];
  weeklyHabits: string[];
};

export class StudyingPlanParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StudyingPlanParseError";
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function parseTasksField(raw: unknown, phaseIndex: number): PlanTask[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new StudyingPlanParseError(
      `Phase ${phaseIndex}: tasks must be a non-empty array`,
    );
  }
  const out: PlanTask[] = [];
  let i = 0;
  for (const item of raw) {
    const t = parsePlanTask(item);
    if (!t) {
      throw new StudyingPlanParseError(
        `Phase ${phaseIndex}: invalid task at index ${i}`,
      );
    }
    out.push(t);
    i += 1;
  }
  return out;
}

/**
 * Parse a single task object. Returns null if structure is invalid.
 * Used by Gemini normalizer and strict plan parse.
 */
export function parsePlanTask(raw: unknown): PlanTask | null {
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
    const scope = raw.scope;
    if (
      !Number.isFinite(minCount) ||
      minCount < 1 ||
      scope !== "phase"
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
    const scope = raw.scope;
    if (
      !Number.isFinite(minMinutes) ||
      minMinutes < 1 ||
      scope !== "phase"
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

function parsePhase(raw: unknown, phaseIndex: number): StoredStudyingPlanPhaseV2 {
  if (!isRecord(raw)) {
    throw new StudyingPlanParseError(`Phase ${phaseIndex}: not an object`);
  }
  const title =
    typeof raw.title === "string" ? raw.title.trim().slice(0, 220) : "";
  const summary =
    typeof raw.summary === "string" ? raw.summary.trim().slice(0, 2000) : "";
  if (title.length < 2 || summary.length < 4) {
    throw new StudyingPlanParseError(`Phase ${phaseIndex}: bad title/summary`);
  }
  const actions = stringArrayField(raw.actions, 40, 2000);
  if (actions.length === 0) {
    throw new StudyingPlanParseError(`Phase ${phaseIndex}: actions required`);
  }
  const tasks = parseTasksField(raw.tasks, phaseIndex);
  let passConditions: string[] | undefined;
  if (raw.passConditions !== undefined) {
    const pc = stringArrayField(raw.passConditions, 20, 1200);
    passConditions = pc.length > 0 ? pc : undefined;
  }
  return {
    title,
    summary,
    actions,
    tasks,
    ...(passConditions ? { passConditions } : {}),
  };
}

function stringArrayField(
  raw: unknown,
  maxLen: number,
  maxStr: number,
): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw.slice(0, maxLen)) {
    if (typeof x !== "string") continue;
    const s = x.trim().slice(0, maxStr);
    if (s.length > 0) out.push(s);
  }
  return out;
}

/** Strict v2 parse for API writes and normalization. */
export function parseStudyingPlanV2Strict(raw: unknown): StoredStudyingPlanV2 {
  if (!isRecord(raw)) {
    throw new StudyingPlanParseError("Plan root must be an object");
  }
  const version = raw.version;
  if (version !== STUDYING_PLAN_JSON_VERSION) {
    throw new StudyingPlanParseError(
      `Expected studying plan version ${STUDYING_PLAN_JSON_VERSION}`,
    );
  }
  if (!Array.isArray(raw.phases) || raw.phases.length === 0) {
    throw new StudyingPlanParseError("phases must be a non-empty array");
  }
  const phases = raw.phases.map((p, i) => parsePhase(p, i));
  const weeklyHabitsRaw = raw.weeklyHabits;
  if (!Array.isArray(weeklyHabitsRaw) || weeklyHabitsRaw.length === 0) {
    throw new StudyingPlanParseError("weeklyHabits must be a non-empty array");
  }
  const weeklyHabits: string[] = [];
  for (const x of weeklyHabitsRaw.slice(0, 20)) {
    if (typeof x !== "string") continue;
    const s = x.trim().slice(0, 500);
    if (s.length > 0) weeklyHabits.push(s);
  }
  if (weeklyHabits.length === 0) {
    throw new StudyingPlanParseError("weeklyHabits had no valid strings");
  }
  return {
    version: STUDYING_PLAN_JSON_VERSION,
    phases,
    weeklyHabits,
  };
}

/** Lenient read path: null if missing or not valid v2. */
export function parseStudyingPlanV2OrNull(
  raw: unknown,
): StoredStudyingPlanV2 | null {
  try {
    if (raw === null || raw === undefined) return null;
    return parseStudyingPlanV2Strict(raw);
  } catch {
    return null;
  }
}

export function phaseCountFromStoredStudyingPlanJson(
  raw: unknown,
): number | null {
  const plan = parseStudyingPlanV2OrNull(raw);
  return plan ? plan.phases.length : null;
}

export function wrapStudyingPlanV2(
  phases: StoredStudyingPlanPhaseV2[],
  weeklyHabits: string[],
): StoredStudyingPlanV2 {
  return {
    version: STUDYING_PLAN_JSON_VERSION,
    phases,
    weeklyHabits,
  };
}

/** Standard copy for fallback / prompt alignment (quiz advancement rule). */
export function standardPhasePassConditionLines(): string[] {
  return [
    `Complete comprehension checks at 70% or above on ${DISTINCT_PASSED_LESSONS_PER_PHASE_STEP} distinct catalog videos (each video counts once when passed).`,
    "Finish the full lesson for each video—including multiple-choice and the short summary question when present.",
  ];
}
