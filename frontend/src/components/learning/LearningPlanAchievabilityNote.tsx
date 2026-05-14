/**
 * Heuristic feasibility note for the learning-plan summary (UX hint only).
 * Uses scores internally; learners see plain language only.
 */
import { formatMessage } from "../../lib/formatMessage";

export type LearningPlanAchievabilityCopy = {
  /** `{horizon}` = resolved timeline label (e.g. “6 months”). */
  achievabilityTitleTemplate: string;
  achievabilitySummaryExcellent: string;
  achievabilitySummaryModerate: string;
  achievabilitySummaryUnlikely: string;
  achievabilitySummaryUnlikelyExtend: string;
};

type Props = {
  horizon: string;
  score: number;
  suggestedMonths: number | null;
  copy: LearningPlanAchievabilityCopy;
};

function renderMarkdownBoldSegments(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((chunk, i) =>
    i % 2 === 1 ?
      <strong key={i} className="font-semibold text-foreground">
        {chunk}
      </strong>
    : <span key={i}>{chunk}</span>,
  );
}

function resolveSummaryText(
  horizon: string,
  score: number,
  suggestedMonths: number | null,
  copy: LearningPlanAchievabilityCopy,
): string {
  const vars = { horizon };
  if (score >= 9) return formatMessage(copy.achievabilitySummaryExcellent, vars);
  if (score >= 5) return formatMessage(copy.achievabilitySummaryModerate, vars);
  if (suggestedMonths != null) {
    return formatMessage(copy.achievabilitySummaryUnlikelyExtend, {
      ...vars,
      months: String(suggestedMonths),
    });
  }
  return formatMessage(copy.achievabilitySummaryUnlikely, vars);
}

/**
 * One short paragraph about goal vs timeline (no numeric scale shown).
 *
 * @param horizon - Resolved timeline label from the plan (updates when time-to-achieve changes).
 * @param score - Integer 0–10 from `computeAchievabilityScore` (internal only)
 * @param suggestedMonths - From plan model when score is low
 * @param copy - Localized strings under `learningPlan`
 */
export function LearningPlanAchievabilityNote({
  horizon,
  score,
  suggestedMonths,
  copy,
}: Props) {
  const summary = resolveSummaryText(horizon, score, suggestedMonths, copy);
  const title = formatMessage(copy.achievabilityTitleTemplate, { horizon });
  return (
    <div className="mt-5 rounded-xl border border-border/70 bg-background/30 px-4 py-3 text-sm leading-relaxed md:text-[15px]">
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-muted-foreground">
        {renderMarkdownBoldSegments(summary)}
      </p>
    </div>
  );
}
