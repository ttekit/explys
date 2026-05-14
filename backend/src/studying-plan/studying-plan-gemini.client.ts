import { Injectable } from "@nestjs/common";
import { DISTINCT_PASSED_LESSONS_PER_PHASE_STEP } from "./studying-plan.constants";
import {
  horizonBudgetFromLabel,
  STRUCTURED_STUDY_FRACTION,
} from "./studying-plan-horizon.util";
import {
  parsePlanTask,
  wrapStudyingPlanV2,
  type PlanTask,
  type StoredStudyingPlanPhaseV2,
  type StoredStudyingPlanV2,
} from "./studying-plan-json.util";
import {
  coarseLevelTier,
  streakTargetForPhase,
  videosPassedPlanTargetForPhase,
  vocabularyTargetForPhase,
} from "./studying-plan-level.util";

export type StudyingPlanGenerationInput = {
  learningGoal: string;
  timeHorizon: string;
  englishLevel: string;
  hobbies: string[];
};

const PHASE_COUNT = 4;
const WEEKLY_HABITS_COUNT = 3;

const TASK_SCHEMA_HINT = [
  "Each phase MUST include a non-empty **tasks** array. Each task object MUST have **id** (short slug string) and **kind** one of:",
  "  distinct_videos_passed: { id, kind, minCount (int >= 1), minScorePct (number 0–100), scope: \"phase\" | \"cumulative\" }",
  "  streak_days: { id, kind, minConsecutive (int >= 1) }",
  "  vocabulary_terms_added: { id, kind, minCount (int >= 1), scope: \"phase\" }",
  "  watch_time_minutes: { id, kind, minMinutes (int >= 1), scope: \"phase\" }",
  "  min_phase_calendar_days: { id, kind, minDays (int >= 1) }",
  "Every phase should include at least one **distinct_videos_passed**, **streak_days**, **vocabulary_terms_added**, **watch_time_minutes**, and **min_phase_calendar_days** task matching the numeric hints for that phase.",
].join("\n");

@Injectable()
export class StudyingPlanGeminiClient {
  async generate(
    input: StudyingPlanGenerationInput,
  ): Promise<StoredStudyingPlanV2 | null> {
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    const apiUrl =
      process.env.GEMINI_API_URL ||
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }

    const hobbyLine =
      input.hobbies.length > 0 ?
        input.hobbies.slice(0, 6).join(", ")
      : "(none given)";

    const budget = horizonBudgetFromLabel(input.timeHorizon);
    const tier = coarseLevelTier(input.englishLevel?.trim() || "");
    const pct = Math.round(STRUCTURED_STUDY_FRACTION * 100);
    const phaseHintLines = [0, 1, 2, 3].map((i) => {
      const d = budget.phaseMinDays[i];
      const w = budget.phaseMinWeeks[i];
      const streak = streakTargetForPhase(i, budget.structuredStudyWeeks);
      const videos = videosPassedPlanTargetForPhase(i);
      const words = vocabularyTargetForPhase(tier, i);
      return `  Phase ${i + 1}: use **min_phase_calendar_days** ≈ ${d} in tasks (≈${w} weeks pacing); streak ≥ ${streak}; distinct videos passed ≥ ${videos} at ≥70%; new words ≈ ${words}; tier “${tier}”.`;
    });

    const timelineBlock = [
      "TIMELINE (non-negotiable):",
      `- Parsed horizon ≈ **${budget.approxTotalDays} days** (~**${budget.approxTotalWeeks} weeks**) from their phrase.`,
      `- The four phases MUST imply a **structured study window ≈ ${budget.structuredStudyDays} days** (~**${budget.structuredStudyWeeks} weeks**), about **${pct}%** of that horizon — do **not** shrink the roadmap to a small fraction of their timeline.`,
      `- Put phase length / pacing **only** in **tasks** (e.g. **min_phase_calendar_days**). Do **not** mention weeks, days-in-phase, or “plan on at least …” schedule wording in **passConditions** — those strings are learner-facing and must not discuss calendar span.`,
    ];

    const passBlock = [
      "CRITICAL — passConditions (every phase, 5–7 strings each):",
      `- State **≥70%** on post-video comprehension for a pass to count.`,
      `- State the app advances the **active phase** after **${DISTINCT_PASSED_LESSONS_PER_PHASE_STEP} distinct** passed videos (each video once).`,
      `- Add **measurable** targets (not vague): **multi-day streak**, **N videos ≥70%** (N **≥** the hint for that phase), **~M new words** from lessons (M from hint), optionally **watch minutes** — numbers must reflect **tier** and **goal**.`,
      `- **No** calendar-span or phase-duration lines in passConditions (no “at least X days/weeks in this phase”, no “90% of horizon”, no structured-window pacing prose).`,
    ];

    const prompt = [
      "You write a structured English learning roadmap for one adult learner using video lessons with comprehension checks (multiple choice + short summary).",
      `Return ONLY valid JSON (no markdown) with this exact top-level shape: { "phases": [ exactly ${PHASE_COUNT} objects ], "weeklyHabits": [ exactly ${WEEKLY_HABITS_COUNT} strings ] }. Use the key name **weeklyHabits** exactly.`,
      "",
      `Each phase object MUST have: "title" (string, <= 90 chars), "summary" (string, 1-2 sentences), "actions" (array of 3-5 short actionable strings), "passConditions" (array of 5-7 strings), "tasks" (array of structured task objects — see TASK SCHEMA below).`,
      "",
      TASK_SCHEMA_HINT,
      "",
      ...timelineBlock,
      "",
      ...passBlock,
      "",
      "Suggested per-phase floors (meet or exceed; round sensibly but do not go below):",
      ...phaseHintLines,
      "",
      "Phases should progress logically: 1) build habit, 2) stretch input, 3) apply/output, 4) sustain until horizon.",
      "weeklyHabits: three concrete weekly rhythms (catalog videos, quizzes, vocabulary review), scaled to tier and horizon length.",
      "",
      `Learner goal: ${input.learningGoal}`,
      `Time horizon (verbatim): ${input.timeHorizon}`,
      `CEFR / level (raw): ${input.englishLevel || "unknown"}`,
      `Hobbies / interests: ${hobbyLine}`,
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
        phases?: unknown;
        weeklyHabits?: unknown;
      };
      const phases = normalizePhases(parsed?.phases);
      const weeklyHabits = normalizeWeekly(parsed?.weeklyHabits);
      if (phases.length !== PHASE_COUNT || weeklyHabits.length !== WEEKLY_HABITS_COUNT) {
        return null;
      }
      return wrapStudyingPlanV2(phases, weeklyHabits);
    } catch {
      return null;
    }
  }
}

function normalizePhases(raw: unknown): StoredStudyingPlanPhaseV2[] {
  if (!Array.isArray(raw)) return [];
  const out: StoredStudyingPlanPhaseV2[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const title =
      typeof o.title === "string" ? o.title.trim().slice(0, 220) : "";
    const summary =
      typeof o.summary === "string" ? o.summary.trim().slice(0, 2000) : "";
    const actions = stringArrayField(o.actions, 40, 2000);
    const passConditions = stringArrayField(o.passConditions, 14, 1200);
    if (!Array.isArray(o.tasks) || o.tasks.length === 0) continue;
    const tasks = normalizeTasksArray(o.tasks);
    if (tasks.length === 0) continue;
    if (
      title.length < 4 ||
      summary.length < 8 ||
      actions.length < 2 ||
      passConditions.length < 4
    ) {
      continue;
    }
    out.push({
      title,
      summary,
      actions,
      tasks,
      passConditions,
    });
  }
  return out;
}

function normalizeTasksArray(raw: unknown[]): PlanTask[] {
  const out: PlanTask[] = [];
  for (const item of raw) {
    const t = parsePlanTask(item);
    if (!t) {
      return [];
    }
    out.push(t);
  }
  return out;
}

function normalizeWeekly(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const s = x.trim().slice(0, 500);
    if (s.length > 0) out.push(s);
  }
  return out.slice(0, WEEKLY_HABITS_COUNT);
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
