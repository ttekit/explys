import { BookOpen } from "lucide-react";
import type { LearningPlanModel } from "../../lib/learningPlan";
import {
  DISTINCT_PASSED_LESSONS_PER_PHASE_STEP,
  passConditionsForDisplay,
} from "../../lib/learningPlan";
import { cn } from "../../lib/utils";
import { formatMessage } from "../../lib/formatMessage";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { renderLightMarkdown } from "../../lib/renderLightMarkdown";

type Props = {
  plan: LearningPlanModel;
  /** e.g. "mb-3 flex ..." */
  headingClassName?: string;
};

export function LearningPlanPhasesSection({ plan, headingClassName }: Props) {
  const { messages } = useLandingLocale();
  const ph = messages.learningPlanPhases;
  return (
    <div>
      <h3
        className={cn(
          "mb-3 flex items-center gap-2 font-display text-lg font-semibold",
          headingClassName,
        )}
      >
        <BookOpen className="size-5 text-primary" />
        {ph.heading}
      </h3>
      <p className="mb-3 text-sm text-muted-foreground">
        {formatMessage(ph.intro, {
          count: String(DISTINCT_PASSED_LESSONS_PER_PHASE_STEP),
        })}
      </p>
      <ol className="space-y-3">
        {plan.phases.map((phase, idx) => {
          const isActive = idx === plan.activePhaseIndex;
          const passLines = passConditionsForDisplay(phase.passConditions);
          return (
            <li
              key={`phase-${idx}`}
              className={cn(
                "rounded-xl border bg-card/60 p-4 md:p-5",
                isActive ?
                  "border-primary/50 ring-2 ring-primary/20"
                : "border-border opacity-90",
              )}
            >
              <div className="mb-2 flex flex-wrap items-baseline gap-2">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    isActive ?
                      "bg-primary text-primary-foreground"
                    : "bg-primary/15 text-primary",
                  )}
                >
                  {idx + 1}
                </span>
                <span className="font-display font-semibold">{phase.title}</span>
                {isActive ?
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {ph.activeBadge}
                  </span>
                : null}
              </div>
              <p className="mb-3 text-sm text-muted-foreground">{phase.summary}</p>
              {passLines.length > 0 ?
                <div className="mb-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 md:p-3.5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300/95">
                    {ph.toComplete}
                  </p>
                  <ul className="space-y-1.5 text-sm text-foreground/90">
                    {passLines.map((line, i) => (
                      <li
                        key={`pass-${idx}-${i}`}
                        className="flex items-start gap-2"
                      >
                        <span
                          className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-500/80"
                          aria-hidden
                        />
                        {renderLightMarkdown(line)}
                      </li>
                    ))}
                  </ul>
                </div>
              : null}
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {ph.suggestedFocus}
              </p>
              <ul className="space-y-1.5 text-sm text-foreground/90">
                {phase.actions.map((a, ai) => (
                  <li
                    key={`act-${idx}-${ai}`}
                    className="flex items-start gap-2"
                  >
                    <span
                      className="mt-1.5 size-1 shrink-0 rounded-full bg-primary/70"
                      aria-hidden
                    />
                    {renderLightMarkdown(a)}
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
