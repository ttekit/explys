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
import { cn } from "../../lib/utils";
import { buildRegisterBody } from "../../lib/registerUser";
import { setStoredAccessToken } from "../../lib/api";
import { setPendingRegistrationLoginWelcome } from "../../lib/registrationStorage";

export default function RegistrationPreferences() {
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const navigate = useNavigate();
  const isTeacher = formData.role === "teacher";

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
        setStoredAccessToken(null);
        if (formData.role === "student" || formData.role === "adult") {
          setPendingRegistrationLoginWelcome();
          navigate("/loginForm", {
            replace: true,
            state: { from: "/catalog", registrationComplete: true },
          });
        } else {
          navigate("/loginForm");
        }
      } else {
        const errorData = await response.json();
        console.error("Registration Error Details:", errorData);

        const errorMessage = Array.isArray(errorData.message)
          ? errorData.message.join(", ")
          : errorData.message;

        alert(
          `Registration failed: ${errorMessage || "Internal Server Error"}`,
        );
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
        rightSubtitle="A few preferences help us tune what you'll watch next."
      >
        <Link
          to="/registrationDetails"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>

        <div className="mb-6 flex items-center gap-3">
          <img src="/Icon.svg" className="w-12 h-15" />
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

          <Button
            type="submit"
            className="rounded-[15px] bg-primary px-6 py-4 text-sm font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]"
          >
            Register
          </Button>
        </form>
      </AuthSplitLayout>
    </>
  );
}
