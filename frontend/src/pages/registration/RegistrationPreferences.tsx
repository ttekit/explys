import Button from "../../components/Button";
import LabelRegister from "../../components/LabelRegister";
import InputText from "../../components/InputText";
import { Link, useNavigate } from "react-router";
import { useContext, FormEvent, useState, useEffect, ChangeEvent } from "react";
import {
  RegistrationContext,
  type FormData,
} from "../../context/RegistrationContext";
import { ArrowLeft } from "lucide-react";
import { AuthSplitLayout } from "../../components/AuthSplitLayout";
import { cn } from "../../lib/utils";
import { buildRegisterBody } from "../../lib/registerUser";
import { setStoredAccessToken } from "../../lib/api";
import { useLandingLocale } from "../../context/LandingLocaleContext";

export default function RegistrationPreferences() {
  const { messages, locale } = useLandingLocale();
  const t = messages.auth.registration.step3;
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const navigate = useNavigate();
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
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/genres`,
        );
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

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildRegisterBody({
              ...formData,
              favoriteGenres: formData.favoriteGenres ?? [],
              hatedGenres: formData.hatedGenres ?? [],
            }),
          ),
        },
      );

      if (response.ok) {
        setStoredAccessToken(null);
        if (formData.role === "student" || formData.role === "adult") {
          setPendingRegistrationLoginWelcome();
          navigate("/loginForm", {
            replace: true,
            state: { from: "/subscribe", registrationComplete: true },
          });
        } else {
          navigate("/loginForm");
        }
        navigate("/email-confirmation", {
          replace: true,
          state: { email: formData.email },
        });
      } else {
        const errorData = await response.json();
        console.error("Registration Error Details:", errorData);

        const errorMessage = Array.isArray(errorData.message)
          ? errorData.message[0]
          : errorData.message;

        setError(errorMessage || "Щось пішло не так");
      }
    } catch (error) {
      console.error("Network error:", error);
      setError("Помилка мережі. Перевірте з'єднання з сервером.");
    } finally {
      setIsLoading(false);
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
                <InputText
                  name="timeToAchieve"
                  value={formData.timeToAchieve ?? ""}
                  onChange={handleLearningFieldsChange}
                  type="text"
                  placeholder={t.placeholderTime}
                  autoComplete="off"
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
          {error && (
            <div className="bg-red-900/20 border border-red-500 text-red-500 p-4 rounded-xl text-sm font-medium animate-in fade-in zoom-in duration-200">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className={`w-full rounded-[15px] bg-primary px-6 py-4 text-sm font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)] ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> {t.register}...
              </span>
            ) : (
              t.register
            )}
          </Button>
        </form>
      </AuthSplitLayout>
    </div>
  );
}
