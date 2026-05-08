import { Link } from "react-router";
import { useMemo } from "react";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  ExternalLink,
  ListChecks,
  Target,
} from "lucide-react";
import type { UserData } from "../../context/UserContext";
import { buildLearningPlanModel } from "../../lib/learningPlan";
import { cn } from "../../lib/utils";

function renderIntroMarkdownish(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((chunk, i) =>
    i % 2 === 1 ?
      <strong key={i} className="font-semibold text-foreground">
        {chunk}
      </strong>
    : <span key={i}>{chunk}</span>,
  );
}

export function ProfileStudyingPlan({ user }: { user: UserData }) {
  const plan = useMemo(() => buildLearningPlanModel(user), [user]);

  if (!user.hasCompletedPlacement) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Studying plan
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your roadmap appears after you finish the entry test.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card/60 p-6">
          <p className="text-sm text-muted-foreground">
            Open the catalog and complete the placement questionnaire. We’ll
            then tailor phases, weekly habits, and goals to your level.
          </p>
          <Link
            to="/catalog"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Go to catalog
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            Studying plan
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your goal and timeline, with phased steps and a weekly rhythm you
            can follow in the catalog.
          </p>
        </div>
        <Link
          to="/learning-plan"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground/85 transition-colors hover:bg-muted/60"
        >
          Full page
          <ExternalLink className="size-3.5 opacity-70" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card/70 p-5">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Target className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Goal
            </span>
          </div>
          <p className="font-semibold leading-snug">{plan.goal}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card/70 p-5">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Calendar className="size-4" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Time to achieve
            </span>
          </div>
          <p className="font-semibold leading-snug">{plan.horizon}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 md:p-6">
        <h3 className="font-display text-lg font-semibold">{plan.headline}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-[15px]">
          {renderIntroMarkdownish(plan.intro)}
        </p>
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <BookOpen className="size-5 text-primary" />
          Phases
        </h3>
        <ol className="space-y-3">
          {plan.phases.map((phase, idx) => (
            <li
              key={phase.title}
              className={cn(
                "rounded-xl border border-border bg-card/60 p-4 md:p-5",
              )}
            >
              <div className="mb-2 flex flex-wrap items-baseline gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {idx + 1}
                </span>
                <span className="font-display font-semibold">{phase.title}</span>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">{phase.summary}</p>
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
          ))}
        </ol>
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-5 md:p-6">
        <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <ListChecks className="size-5 text-primary" />
          Weekly rhythm
        </h3>
        <ul className="space-y-2 text-sm md:text-[15px]">
          {plan.weeklyHabits.map((h) => (
            <li key={h} className="flex gap-2">
              <span
                className="mt-2 size-1 shrink-0 rounded-full bg-emerald-500/90"
                aria-hidden
              />
              {h}
            </li>
          ))}
        </ul>
      </div>

      <Link
        to="/catalog"
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Continue in catalog
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
