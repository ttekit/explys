import { DISTINCT_PASSED_LESSONS_PER_PHASE_STEP } from "./studying-plan.constants";
import type { HorizonBudget } from "./studying-plan-horizon.util";
import type { CoarseLevelTier } from "./studying-plan-level.util";
import {
  streakTargetForPhase,
  videosPassedPlanTargetForPhase,
  vocabularyTargetForPhase,
} from "./studying-plan-level.util";
import { standardPhasePassConditionLines } from "./studying-plan-json.util";
import type { PlanTask } from "./studying-plan-json.util";

export function richPassConditionsForPhase(options: {
  phaseIndex: number;
  budget: HorizonBudget;
  tier: CoarseLevelTier;
  learningGoal: string;
}): string[] {
  const { phaseIndex, budget, tier, learningGoal } = options;
  const base = standardPhasePassConditionLines();

  const streak = streakTargetForPhase(phaseIndex, budget.structuredStudyWeeks);
  const videos = videosPassedPlanTargetForPhase(phaseIndex);
  const words = vocabularyTargetForPhase(tier, phaseIndex);

  const out = [...base];
  out.push(
    `Reach a **${streak}-day** study streak at least once (each day with meaningful catalog practice counts).`,
    `Pass **at least ${videos}** distinct videos at **≥70%** on comprehension checks (the app advances after **${DISTINCT_PASSED_LESSONS_PER_PHASE_STEP}** distinct passes — treat **${videos}** as your depth target for this phase).`,
    `Learn or consolidate **~${words}** new words from lessons (saved words + reviews in the app).`,
    `Keep clip and quiz choices aligned with your goal: **${learningGoal}**.`,
  );
  return out;
}

/** Structured tasks for v2 storage (single source of truth for thresholds). */
export function buildPlanTasksForPhase(options: {
  phaseIndex: number;
  budget: HorizonBudget;
  tier: CoarseLevelTier;
}): PlanTask[] {
  const { phaseIndex, budget, tier } = options;
  const streak = streakTargetForPhase(phaseIndex, budget.structuredStudyWeeks);
  const videos = videosPassedPlanTargetForPhase(phaseIndex);
  const words = vocabularyTargetForPhase(tier, phaseIndex);
  const minPhaseDays = Math.max(1, budget.phaseMinDays[phaseIndex]);
  const watchMinutes = 45 + phaseIndex * 45;

  const idx = phaseIndex;
  return [
    {
      id: `p${idx}-videos-passed`,
      kind: "distinct_videos_passed" as const,
      minCount: videos,
      minScorePct: 70,
      scope: "phase" as const,
    },
    {
      id: `p${idx}-streak`,
      kind: "streak_days" as const,
      minConsecutive: streak,
    },
    {
      id: `p${idx}-vocab`,
      kind: "vocabulary_terms_added" as const,
      minCount: words,
      scope: "phase" as const,
    },
    {
      id: `p${idx}-watch`,
      kind: "watch_time_minutes" as const,
      minMinutes: watchMinutes,
      scope: "phase" as const,
    },
    {
      id: `p${idx}-calendar`,
      kind: "min_phase_calendar_days" as const,
      minDays: minPhaseDays,
    },
  ];
}
