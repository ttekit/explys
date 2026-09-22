import Button from "../../components/Button";
import { Link, useNavigate } from "react-router";
import { useContext, FormEvent, useEffect, useState } from "react";
import { RegistrationContext } from "../../context/RegistrationContext";
import { ArrowLeft } from "lucide-react";
import { AuthSplitLayout } from "../../components/AuthSplitLayout";
import { AuthPageSeo } from "../../lib/authPageSeo";
import { apiFetch } from "../../lib/api";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { useUser } from "../../context/UserContext";
import { resolveRegistrationCompletionPath } from "../../lib/learnerOnboarding";
import { clearRegistrationSession } from "../../lib/registrationSession";
import { LearningPurposeFields } from "../../components/registration/LearningPurposeFields";

export default function RegistrationPreferences() {
  const { messages, locale } = useLandingLocale();
  const t = messages.auth.registration.step3;
  const regSeo = messages.auth.registration.step1;
  const alerts = messages.auth.registration.step3Alerts;
  const lpLearn = messages.learningPlan;
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const navigate = useNavigate();
  const { user, refreshProfile } = useUser();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentRole = (
    user?.role ? String(user.role) : String(formData.role || "")
  ).toLowerCase();
  const isTeacher = currentRole === "teacher";
  const isAdult = currentRole === "adult";

  useEffect(() => {
    if (isTeacher) {
      navigate("/catalog", { replace: true });
    }
  }, [isTeacher, navigate]);

  const handleSkip = async () => {
    const profile = (await refreshProfile()) ?? user;
    clearRegistrationSession();
    navigate(resolveRegistrationCompletionPath(profile), { replace: true });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        favoriteGenres: formData.favoriteGenres,
        hatedGenres: formData.hatedGenres,
        learningGoal: formData.learningGoal,
        timeToAchieve: formData.timeToAchieve,
      };

      const response = await apiFetch("/auth/update-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const profile = await refreshProfile();
        clearRegistrationSession();
        navigate(resolveRegistrationCompletionPath(profile), { replace: true });
      } else {
        const errorData = await response.json();
        alert(
          `${alerts.failedPrefix} ${errorData.message || alerts.failedFallback}`,
        );
      }
    } catch (error) {
      console.error("Error updating preferences:", error);
      alert(alerts.network);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthPageSeo
        title={regSeo.seoTitle}
        description={regSeo.seoDescription}
        path="/register-preferences"
      />
      <div lang={locale === "uk" ? "uk" : "en"}>
        <AuthSplitLayout
          progressStep={2}
          progressTotal={3}
          rightTitle={t.rightTitle}
          rightSubtitle={t.rightSubtitle}
        >
          <Link
            to="/register"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {t.back}
          </Link>

          <div className="mb-6 flex items-center gap-3">
            {isAdult ? (
              <img src={`${import.meta.env.BASE_URL}AdultIcon.svg`} className="w-12 h-15" alt="" />
            ) : (
              <img src={`${import.meta.env.BASE_URL}StudentIcon.svg`} className="w-12 h-15" alt="" />
            )}
            <div>
              <h1 className="font-display text-2xl font-bold">
                {currentRole === "student" ? t.titleStudent : t.titleAdult}
              </h1>
              <p className="text-sm text-muted-foreground">{t.lead}</p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <LearningPurposeFields
              learningGoal={formData.learningGoal || ""}
              timeToAchieve={formData.timeToAchieve ?? ""}
              labels={{
                goalTitle: t.goalTitle,
                optional: t.optional,
                goalLead: t.goalLead,
                pointOfLearning: t.pointOfLearning,
                timeToAchieve: t.timeToAchieve,
                placeholderGoal: t.placeholderGoal,
              }}
              unitLabels={{
                day: lpLearn.timeToAchieveUnitDays,
                month: lpLearn.timeToAchieveUnitMonths,
                year: lpLearn.timeToAchieveUnitYears,
                unitSelectAria: lpLearn.timeToAchieveUnitSelectAria,
              }}
              onLearningGoalChange={(value) =>
                updateFormData({ learningGoal: value })
              }
              onTimeToAchieveChange={(value) =>
                updateFormData({ timeToAchieve: value })
              }
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                className="w-full rounded-xl border border-border bg-background px-6 py-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted cursor-pointer"
                onClick={handleSkip}
              >
                {t.skip}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer"
              >
                {t.continueToPlans}
              </Button>
            </div>
          </form>
        </AuthSplitLayout>
      </div>
    </>
  );
}