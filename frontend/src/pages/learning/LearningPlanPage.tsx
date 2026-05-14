import { Navigate, Link } from "react-router";
import { useMemo } from "react";
import {
  ArrowRight,
  Calendar,
  Sparkles,
  Target,
  ListChecks,
  RefreshCw,
  Loader2,
} from "lucide-react";
import ContentHeader from "../../components/catalog/ContentHeader";
import { LearningPlanPhasesSection } from "../../components/learning/LearningPlanPhasesSection";
import { useUser } from "../../context/UserContext";
import { useRegenerateStudyingPlan } from "../../hooks/useRegenerateStudyingPlan";
import { buildLearningPlanModel } from "../../lib/learningPlan";
import { useLandingLocale } from "../../context/LandingLocaleContext";

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

export default function LearningPlanPage() {
  const { user, isLoading, isLoggedIn } = useUser();
  const { regenerate, isRegenerating } = useRegenerateStudyingPlan();
  const { messages } = useLandingLocale();
  const lp = messages.learningPlan;

  const plan = useMemo(
    () => (user ? buildLearningPlanModel(user) : null),
    [user],
  );

  if (!isLoading && (!isLoggedIn || !user)) {
    return (
      <Navigate
        to="/loginForm"
        replace
        state={{ from: "/learning-plan" }}
      />
    );
  }

  if (!isLoading && user && !user.hasCompletedPlacement) {
    return <Navigate to="/catalog" replace />;
  }

  return (
    <div className="relative min-h-screen bg-background font-display text-foreground antialiased">
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,oklch(0.59_0.16_165/_35%)_0%,transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.65_0.25_295/_18%)_0%,transparent_50%)]" />
      <div className="absolute inset-0 bg-card/55" />

      <ContentHeader />

      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-24 pt-28 md:pt-32">
        {isLoading || !plan || !user ?
          <p className="text-center text-sm text-muted-foreground">{lp.loading}</p>
        : <>
            <div className="mb-10 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" />
                {lp.badge}
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {lp.title}
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
                {lp.subtitle}
              </p>
              <button
                type="button"
                onClick={() => void regenerate()}
                disabled={isRegenerating}
                className="mx-auto mt-5 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/80 px-4 py-2.5 text-sm font-medium text-foreground/90 shadow-sm transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-60"
              >
                {isRegenerating ?
                  <Loader2 className="size-4 animate-spin text-primary" aria-hidden
                  />
                : <RefreshCw className="size-4 text-primary" aria-hidden />}
                {isRegenerating ? lp.regenerating : lp.regenerateCta}
              </button>
            </div>

            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur-sm">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <Target className="size-5" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {lp.goalLabel}
                  </span>
                </div>
                <p className="text-lg font-semibold leading-snug">{plan.goal}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur-sm">
                <div className="mb-2 flex items-center gap-2 text-primary">
                  <Calendar className="size-5" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {lp.timeLabel}
                  </span>
                </div>
                <p className="text-lg font-semibold leading-snug">
                  {plan.horizon}
                </p>
              </div>
            </div>

            <div className="mb-10 rounded-2xl border border-primary/25 bg-primary/5 p-6 md:p-8">
              <h2 className="font-display text-xl font-bold">{plan.headline}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                {renderIntroMarkdownish(plan.intro)}
              </p>
            </div>

            <div className="mb-10">
              <LearningPlanPhasesSection
                plan={plan}
                headingClassName="font-display text-xl font-bold"
              />
            </div>

            <div className="mb-12 rounded-2xl border border-border bg-card/80 p-6 md:p-8">
              <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
                <ListChecks className="size-6 text-primary" />
                {lp.weeklyRhythm}
              </h2>
              <ul className="space-y-3 text-sm md:text-base">
                {plan.weeklyHabits.map((h) => (
                  <li key={h} className="flex gap-3">
                    <span
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-emerald-500/90"
                      aria-hidden
                    />
                    {h}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/catalog"
                className="inline-flex items-center justify-center gap-2 rounded-[15px] bg-primary px-8 py-4 text-sm font-semibold text-foreground/70 shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)] transition-all hover:bg-purple-hover hover:text-white"
              >
                {lp.goCatalog}
                <ArrowRight className="size-4" />
              </Link>
              <Link
                to="/profile"
                className="inline-flex items-center justify-center rounded-[15px] border border-border px-8 py-3.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted/50"
              >
                {lp.updateProfileGoal}
              </Link>
            </div>
          </>
        }
      </main>
    </div>
  );
}
