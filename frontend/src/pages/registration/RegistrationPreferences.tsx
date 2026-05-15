import Button from "../../components/Button";
import LabelRegister from "../../components/LabelRegister";
import InputText from "../../components/InputText";
import { TimeToAchieveField } from "../../components/TimeToAchieveField";
import { Link, useNavigate } from "react-router";
import {
  useContext,
  FormEvent,
  useState,
  useEffect,
  ChangeEvent,
  useMemo,
} from "react";
import {
  RegistrationContext,
  type FormData,
} from "../../context/RegistrationContext";
import { ArrowLeft } from "lucide-react";
import { AuthSplitLayout } from "../../components/AuthSplitLayout";
import { cn } from "../../lib/utils";
import { registerUser } from "../../lib/registerUser";
import { apiFetch, setStoredAccessToken } from "../../lib/api";
import { setPendingRegistrationLoginWelcome } from "../../lib/registrationStorage";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { useUser } from "../../context/UserContext";

export default function RegistrationPreferences() {
  const { messages, locale } = useLandingLocale();
  const t = messages.auth.registration.step3;
  const alerts = messages.auth.registration.step3Alerts;
  const registrationErrors = messages.auth.registration.errors;
  const lpLearn = messages.learningPlan;
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const navigate = useNavigate();
  const { refreshProfile } = useUser();

  const credentialMsgs = useMemo(
    () => ({
      credentialEmail: registrationErrors.credentialEmail,
      credentialPassword: registrationErrors.credentialPassword,
      passwordsDontMatch: registrationErrors.passwordsNoMatch || "",
    }),
    [
      registrationErrors.credentialEmail,
      registrationErrors.credentialPassword,
      registrationErrors.passwordsNoMatch,
    ],
  );
  const isTeacher = formData.role === "teacher";
  const isAdult = formData.role === "adult";

  const handleLearningFieldsChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value } as Partial<FormData>);
  };

  type GenreChip = { value: number; label: string };
  const [genreOptions, setGenreOptions] = useState<GenreChip[]>([]);

  useEffect(() => {
    if (isTeacher) {
      navigate("/registrationDetails", { replace: true });
    }
  }, [isTeacher, navigate]);

  useEffect(() => {
    if (isTeacher) return;

    const fetchGenres = async () => {
      try {
        const response = await apiFetch("/genres");
        if (response.ok) {
          const data = (await response.json()) as {
            id: number;
            name: string;
          }[];
          setGenreOptions(data.map((g) => ({ value: g.id, label: g.name })));
        }
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };
    fetchGenres();
  }, [isTeacher]);

  const favoriteIds = formData.favoriteGenres ?? [];
  const hatedIds = formData.hatedGenres ?? [];

  const toggleFavorite = (id: number) => {
    if (hatedIds.includes(id)) return;
    const next = favoriteIds.includes(id)
      ? favoriteIds.filter((x) => x !== id)
      : [...favoriteIds, id];
    updateFormData({
      favoriteGenres: next,
      hatedGenres: hatedIds.filter((h) => !next.includes(h)),
    } as Partial<FormData>);
  };

  const toggleHated = (id: number) => {
    if (favoriteIds.includes(id)) return;
    const next = hatedIds.includes(id)
      ? hatedIds.filter((x) => x !== id)
      : [...hatedIds, id];
    updateFormData({
      hatedGenres: next,
      favoriteGenres: favoriteIds.filter((f) => !next.includes(f)),
    } as Partial<FormData>);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const result = await registerUser(formData, credentialMsgs, alerts.network);

      if (result.success) {
        const token = result.accessToken;
        if (token) {
          setStoredAccessToken(token);
          await refreshProfile();
        }
        setPendingRegistrationLoginWelcome();
        navigate("/subscribe", { replace: true });
      } else {
        alert(`${alerts.failedPrefix} ${result.message || alerts.failedFallback}`);
      }
    } catch (error) {
      console.error("Network or parsing error:", error);
      alert(alerts.network);
    }
  };

  if (isTeacher) {
    return null;
  }

  return (
    <div lang={locale === "uk" ? "uk" : "en"}>
      <AuthSplitLayout
        progressStep={3}
        progressTotal={3}
        rightTitle={t.rightTitle}
        rightSubtitle={t.rightSubtitle}
      >
        <Link
          to="/registrationDetails"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t.back}
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <img src="/Icon.svg" className="w-12 h-15" alt="" />
          <div>
            <h1 className="font-display text-2xl font-bold">
              {formData.role === "student" ? t.titleStudent : t.titleAdult}
            </h1>
            <p className="text-sm text-muted-foreground">{t.lead}</p>
          </div>
        </div>

        <form className="space-y-8" onSubmit={handleSubmit}>
          {isAdult && (
            <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
              <div>
                <h2 className="font-display text-lg font-semibold">
                  {t.goalTitle}{" "}
                  <span className="font-normal text-muted-foreground">
                    {t.optional}
                  </span>
                </h2>
                <p className="text-sm text-muted-foreground">{t.goalLead}</p>
              </div>
              <div className="space-y-2">
                <LabelRegister isRequired={false}>
                  {t.pointOfLearning}
                </LabelRegister>
                <InputText
                  name="learningGoal"
                  value={formData.learningGoal ?? ""}
                  onChange={handleLearningFieldsChange}
                  type="text"
                  placeholder={t.placeholderGoal}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <LabelRegister isRequired={false}>
                  {t.timeToAchieve}
                </LabelRegister>
                <TimeToAchieveField
                  id="registration-time-to-achieve"
                  value={formData.timeToAchieve ?? ""}
                  allowEmpty
                  onChange={(serialized) =>
                    updateFormData({
                      timeToAchieve: serialized,
                    } as Partial<FormData>)
                  }
                  unitLabels={{
                    day: lpLearn.timeToAchieveUnitDays,
                    month: lpLearn.timeToAchieveUnitMonths,
                    year: lpLearn.timeToAchieveUnitYears,
                    unitSelectAria: lpLearn.timeToAchieveUnitSelectAria,
                  }}
                />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <LabelRegister isRequired={false}>{t.genresLove}</LabelRegister>
            <p className="text-sm text-muted-foreground">{t.genresLoveHint}</p>
            <div className="flex flex-wrap gap-2">
              {genreOptions.map((genre) => {
                const inactive = hatedIds.includes(genre.value);
                const active = favoriteIds.includes(genre.value);
                return (
                  <button
                    key={`f-${genre.value}`}
                    type="button"
                    disabled={inactive}
                    onClick={() => toggleFavorite(genre.value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                      active
                        ? "bg-primary text-primary-foreground"
                        : inactive
                          ? "cursor-not-allowed bg-muted text-muted-foreground opacity-45"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {genre.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <LabelRegister isRequired={false}>{t.genresAvoid}</LabelRegister>
            <p className="text-sm text-muted-foreground">{t.genresAvoidHint}</p>
            <div className="flex flex-wrap gap-2">
              {genreOptions.map((genre) => {
                const inactive = favoriteIds.includes(genre.value);
                const active = hatedIds.includes(genre.value);
                return (
                  <button
                    key={`h-${genre.value}`}
                    type="button"
                    disabled={inactive}
                    onClick={() => toggleHated(genre.value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
                      active
                        ? "bg-destructive text-destructive-foreground"
                        : inactive
                          ? "cursor-not-allowed bg-muted text-muted-foreground opacity-45"
                          : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {genre.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            type="submit"
            className="rounded-[15px] bg-primary px-6 py-4 text-sm font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]"
          >
            {t.continueToPlans}
          </Button>
        </form>
      </AuthSplitLayout>
    </div>
  );
}
