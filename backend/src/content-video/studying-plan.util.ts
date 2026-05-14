/** Mirrors frontend `learningPlan.ts` defaults for profile “Studying plan”. */
export const DEFAULT_LEARNING_GOAL = "Improve language";
export const DEFAULT_TIME_HORIZON = "1 year";

export function effectiveLearningGoal(
  raw: string | null | undefined,
): string {
  const t = raw?.trim();
  return t && t.length > 0 ? t : DEFAULT_LEARNING_GOAL;
}

export function effectiveTimeHorizon(
  raw: string | null | undefined,
): string {
  const t = raw?.trim();
  return t && t.length > 0 ? t : DEFAULT_TIME_HORIZON;
}
