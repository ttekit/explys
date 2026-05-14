import { phaseCountFromStoredStudyingPlanJson } from "../studying-plan/studying-plan-json.util";
import { DISTINCT_PASSED_LESSONS_PER_PHASE_STEP } from "../studying-plan/studying-plan.constants";

export { DISTINCT_PASSED_LESSONS_PER_PHASE_STEP };

export function phaseCountFromStoredPhases(
  studyingPlanPhases: unknown,
  fallback = 4,
): number {
  const n = phaseCountFromStoredStudyingPlanJson(studyingPlanPhases);
  if (n != null && n > 0) return n;
  return fallback;
}

/** 0-based index into the learner's phase list. */
export function activeStudyingPhaseFromPassedLessons(
  distinctPassedLessonCount: number,
  phaseCount: number,
): number {
  if (phaseCount <= 1) return 0;
  const maxIdx = phaseCount - 1;
  return Math.min(
    Math.floor(
      Math.max(0, distinctPassedLessonCount) /
        DISTINCT_PASSED_LESSONS_PER_PHASE_STEP,
    ),
    maxIdx,
  );
}
