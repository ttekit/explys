import { Link } from "react-router";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  ArrowRight,
  Calendar,
  ExternalLink,
  ListChecks,
  Loader2,
  Save,
  Target,
} from "lucide-react";
import toast from "react-hot-toast";
import type { UserData } from "../../context/UserContext";
import { useUser } from "../../context/UserContext";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { apiFetch, getResponseErrorMessage } from "../../lib/api";
import { buildLearningPlanModel } from "../../lib/learningPlan";
import { LearningPlanPhasesSection } from "../learning/LearningPlanPhasesSection";
import { LearningPlanAchievabilityNote } from "../learning/LearningPlanAchievabilityNote";
import { LEARNING_PLAN_UK_DEFAULTS } from "../../locales/learningPlanUkDefaults";
import { renderLightMarkdown } from "../../lib/renderLightMarkdown";
import InputText from "../InputText";
import { TimeToAchieveField } from "../TimeToAchieveField";
import { canonicalTimeToAchieveFromProfile } from "../../lib/timeToAchieve";

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
  const { refreshProfile } = useUser();
  const { locale, messages } = useLandingLocale();
  const regStep3 = messages.auth.registration.step3;
  const lp = messages.learningPlan;

  const [learningGoal, setLearningGoal] = useState(user.learningGoal ?? "");
  const [timeToAchieve, setTimeToAchieve] = useState(() =>
    canonicalTimeToAchieveFromProfile(user.timeToAchieve),
  );
  const [savingGoalHorizon, setSavingGoalHorizon] = useState(false);

  useEffect(() => {
    setLearningGoal(user.learningGoal ?? "");
    setTimeToAchieve(canonicalTimeToAchieveFromProfile(user.timeToAchieve));
  }, [user.learningGoal, user.timeToAchieve]);

  const planPreview = useMemo(() => {
    const patched: UserData = {
      ...user,
      learningGoal: learningGoal.trim(),
      timeToAchieve: canonicalTimeToAchieveFromProfile(timeToAchieve),
    };
    return buildLearningPlanModel(
      patched,
      locale === "uk" ? LEARNING_PLAN_UK_DEFAULTS : undefined,
      locale === "uk" ? "uk" : "en",
    );
  }, [user, learningGoal, timeToAchieve, locale]);

  const goalHorizonUnchanged =
    learningGoal.trim() === (user.learningGoal ?? "").trim() &&
    canonicalTimeToAchieveFromProfile(timeToAchieve) ===
      canonicalTimeToAchieveFromProfile(user.timeToAchieve);

  async function saveGoalAndHorizon(): Promise<void> {
    const trimmedGoal = learningGoal.trim();
    const trimmedTime = canonicalTimeToAchieveFromProfile(timeToAchieve);
    setSavingGoalHorizon(true);
    try {
      const id = Number(user.id);
      const res = await apiFetch(`/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learningGoal: trimmedGoal,
          timeToAchieve: trimmedTime,
        }),
      });
      if (!res.ok) {
        toast.error(await getResponseErrorMessage(res));
        return;
      }
      const regRes = await apiFetch(
        "/auth/profile/regenerate-studying-plan",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale }),
        },
      );
      if (!regRes.ok) {
        const serverMsg = (await getResponseErrorMessage(regRes)).trim();
        toast.error(
          serverMsg ?
            `${serverMsg} — ${lp.profileGoalSavedPlanRegenerateFailedToast}`
          : lp.profileGoalSavedPlanRegenerateFailedToast,
        );
        await refreshProfile();
        return;
      }
      toast.success(lp.profileGoalSavedAndPlanRegeneratedToast);
      await refreshProfile();
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : lp.profileGoalHorizonSaveError,
      );
    } finally {
      setSavingGoalHorizon(false);
    }
  }

  if (!user.hasCompletedPlacement) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">
            {lp.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {lp.profileIncompleteLead}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card/60 p-6">
          <p className="text-sm text-muted-foreground">
            {lp.profileIncompleteBody}
          </p>
          <Link
            to="/catalog"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {lp.goCatalog}
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
            {lp.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {lp.profileDescription}
          </p>
        </div>
        <Link
          to="/learning-plan"
          className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground/85 transition-colors hover:bg-muted/60"
        >
          {lp.openFullPage}
          <ExternalLink className="size-3.5 opacity-70" />
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-5 md:p-6">
        <p className="mb-4 text-sm text-muted-foreground">
          {lp.profileGoalHorizonLead}
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="profile-learning-goal"
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              <Target className="size-4 text-primary" />
              {regStep3.pointOfLearning}
            </label>
            <InputText
              id="profile-learning-goal"
              name="learningGoal"
              value={learningGoal}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setLearningGoal(e.target.value)
              }
              type="text"
              placeholder={regStep3.placeholderGoal}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="profile-time-to-achieve"
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              <Calendar className="size-4 text-primary" />
              {regStep3.timeToAchieve}
            </label>
            <TimeToAchieveField
              id="profile-time-to-achieve"
              value={timeToAchieve}
              onChange={setTimeToAchieve}
              unitLabels={{
                day: lp.timeToAchieveUnitDays,
                month: lp.timeToAchieveUnitMonths,
                year: lp.timeToAchieveUnitYears,
                unitSelectAria: lp.timeToAchieveUnitSelectAria,
              }}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void saveGoalAndHorizon()}
            disabled={savingGoalHorizon || goalHorizonUnchanged}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {savingGoalHorizon ?
              <Loader2 className="size-4 animate-spin" aria-hidden
              />
            : <Save className="size-4" aria-hidden />}
            {savingGoalHorizon ?
              lp.profileSavingGoalHorizon
            : lp.profileSaveGoalHorizonCta}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 md:p-6">
        <h3 className="font-display text-lg font-semibold">
          {planPreview.headline}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-[15px]">
          {renderIntroMarkdownish(planPreview.intro)}
        </p>
        <LearningPlanAchievabilityNote
          horizon={planPreview.horizon}
          score={planPreview.achievabilityScore}
          suggestedMonths={planPreview.achievabilitySuggestedMonths}
          copy={lp}
        />
      </div>

      <div>
        <LearningPlanPhasesSection plan={planPreview} />
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-5 md:p-6">
        <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
          <ListChecks className="size-5 text-primary" />
          {lp.weeklyRhythm}
        </h3>
        <ul className="space-y-2 text-sm md:text-[15px]">
          {planPreview.weeklyHabits.map((h, hi) => (
            <li
              key={`${hi}-${h.slice(0, 24)}`}
              className="flex items-start gap-2"
            >
              <span
                className="mt-2 size-1 shrink-0 rounded-full bg-emerald-500/90"
                aria-hidden
              />
              {renderLightMarkdown(h)}
            </li>
          ))}
        </ul>
      </div>

      <Link
        to="/catalog"
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {lp.continueInCatalog}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
