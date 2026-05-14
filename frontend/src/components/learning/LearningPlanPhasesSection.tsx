import { BookOpen } from "lucide-react";
import type { LearningPlanModel } from "../../lib/learningPlan";
import {
  DISTINCT_PASSED_LESSONS_PER_PHASE_STEP,
  passConditionsForDisplay,
} from "../../lib/learningPlan";
import { cn } from "../../lib/utils";

type Props = {
  plan: LearningPlanModel;
  /** e.g. "mb-3 flex ..." */
  headingClassName?: string;
};

export function LearningPlanPhasesSection({ plan, headingClassName }: Props) {
  return (
    <div>
      <h3
        className={cn(
          "mb-3 flex items-center gap-2 font-display text-lg font-semibold",
          headingClassName,
        )}
      >
        <BookOpen className="size-5 text-primary" />
        Phases
      </h3>
      <p className="mb-3 text-sm text-muted-foreground">
        Your <strong className="font-semibold text-foreground">active phase</strong>{" "}
        updates automatically when you pass comprehension checks: each step needs
        about {DISTINCT_PASSED_LESSONS_PER_PHASE_STEP} distinct videos with a
        passing score (70%+) before the plan advances. Earlier phases stay available
        as reference.
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
                    Active phase
                  </span>
                : null}
              </div>
              <p className="mb-3 text-sm text-muted-foreground">{phase.summary}</p>
              {passLines.length > 0 ?
                <div className="mb-3 rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3 md:p-3.5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300/95">
                    To complete this phase
                  </p>
                  <ul className="space-y-1.5 text-sm text-foreground/90">
                    {passLines.map((line, i) => (
                      <li key={`pass-${idx}-${i}`} className="flex gap-2">
                        <span
                          className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-500/80"
                          aria-hidden
                        />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              : null}
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Suggested focus
              </p>
              <ul className="space-y-1.5 text-sm text-foreground/90">
                {phase.actions.map((a) => (
                  <li key={a} className="flex gap-2">
                    <span
                      className="mt-1.5 size-1 shrink-0 rounded-full bg-primary/70"
                      aria-hidden
                    />
                    {a}
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
