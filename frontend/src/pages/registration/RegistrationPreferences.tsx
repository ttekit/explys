import Button from "../../components/Button";
import LabelRegister from "../../components/LabelRegister";
import { Link, useNavigate } from "react-router";
import { useContext, FormEvent, useState, useEffect } from "react";
import {
  RegistrationContext,
  type FormData,
} from "../../context/RegistrationContext";
import { ArrowLeft } from "lucide-react";
import { AuthSplitLayout } from "../../components/AuthSplitLayout";
import { ChameleonMascot } from "../../components/ChameleonMascot";
import { cn } from "../../lib/utils";
import { buildRegisterBody } from "../../lib/registerUser";

export default function RegistrationPreferences() {
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const navigate = useNavigate();
  const isTeacher = formData.role === "teacher";

  type GenreChip = { value: number; label: string };
  const [genreOptions, setGenreOptions] = useState<GenreChip[]>([]);
  const [showLevelTestModal, setShowLevelTestModal] = useState(false);

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
          setGenreOptions(
            data.map((g) => ({ value: g.id, label: g.name })),
          );
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
    const next =
      favoriteIds.includes(id)
        ? favoriteIds.filter((x) => x !== id)
        : [...favoriteIds, id];
    updateFormData({
      favoriteGenres: next,
      hatedGenres: hatedIds.filter((h) => !next.includes(h)),
    } as Partial<FormData>);
  };

  const toggleHated = (id: number) => {
    if (favoriteIds.includes(id)) return;
    const next =
      hatedIds.includes(id)
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
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
        if (formData.role === "student" || formData.role === "adult") {
          setShowLevelTestModal(true);
        } else {
          navigate("/loginForm");
        }
      } else {
        const errorData = await response.json();
        console.error("Registration Error Details:", errorData);

        const errorMessage = Array.isArray(errorData.message)
          ? errorData.message.join(", ")
          : errorData.message;

        alert(`Registration failed: ${errorMessage || "Internal Server Error"}`);
      }
    } catch (error) {
      console.error("Network or parsing error:", error);
      alert("Network error. Please check if your backend server is running.");
    }
  };

  if (isTeacher) {
    return null;
  }

  return (
    <>
      <AuthSplitLayout
        progressStep={3}
        progressTotal={3}
        rightTitle="Almost there!"
        rightSubtitle="A few preferences help us tune what you&apos;ll watch next."
        rightMascotMood="excited"
      >
        <Link
          to="/registrationDetails"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <ChameleonMascot
            size="sm"
            mood="happy"
            animate={false}
          />
          <div>
            <h1 className="font-display text-2xl font-bold">
              {formData.role === "student"
                ? "Student preferences"
                : "Your preferences"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose genres we should lean toward—and ones to hide.
            </p>
          </div>
        </div>

        <form className="space-y-8" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <LabelRegister isRequired={false}>Genres you love</LabelRegister>
            <p className="text-sm text-muted-foreground">
              We&apos;ll recommend more from genres you pick here.
            </p>
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
            <LabelRegister isRequired={false}>Genres to avoid</LabelRegister>
            <p className="text-sm text-muted-foreground">
              We&apos;ll filter out selections from these buckets.
            </p>
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

          <Button type="submit" className="py-6 text-base font-semibold">
            Register
          </Button>
        </form>
      </AuthSplitLayout>

      {showLevelTestModal && (
        <div className="bg-background/85 fixed inset-0 z-50 flex items-center justify-center px-4 backdrop-blur-sm">
          <div className="border-border bg-card text-card-foreground w-full max-w-md rounded-3xl border p-8 shadow-2xl">
            <div className="bg-primary/15 text-primary mb-3 flex size-16 items-center justify-center rounded-2xl">
              <svg
                className="size-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="font-display mb-2 text-2xl font-bold">
              Determine your level
            </h2>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              You&apos;re almost done. Take a quick placement test so we can recommend
              the best videos—or skip for now and start exploring.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => navigate("/catalog")}
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-xl py-3.5 font-bold transition-colors active:scale-[0.98]"
              >
                Take the test
              </button>
              <button
                type="button"
                onClick={() => navigate("/loginForm")}
                className="border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full rounded-xl border py-3.5 font-bold transition-colors active:scale-[0.98]"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
