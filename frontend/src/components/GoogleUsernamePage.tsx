import { useState, FormEvent } from "react";
import { useNavigate } from "react-router";
import { useLandingLocale } from "../context/LandingLocaleContext";
import { useUser } from "../context/UserContext";
import { apiFetch } from "../lib/api";
import { AuthSplitLayout } from "./AuthSplitLayout";
import { AuthPageSeo } from "../lib/authPageSeo";
import InputText from "./InputText";
import LabelRegister from "./LabelRegister";
import Button from "./Button";
import ValidateError from "./ValidateError";
import { ArrowRight } from "lucide-react";

export default function GoogleUsernamePage() {
  const navigate = useNavigate();
  const { messages } = useLandingLocale();
  const texts = messages.googleUsername;

  const { user, refreshProfile } = useUser();

  const [username, setUsername] = useState("");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTeacher = user?.role?.toLowerCase() === "teacher";
  const layoutProgressTotal = isTeacher ? 2 : 3;

  const displayTitle = isTeacher ? texts.titleTeacher : texts.title;
  const displayLead = isTeacher ? texts.leadTeacher : texts.lead;
  const displayLabel = isTeacher ? texts.labelTeacher : texts.label;
  const displayPlaceholder = isTeacher
    ? texts.placeholderTeacher
    : texts.placeholder;

  const displayRightTitle = isTeacher
    ? texts.rightTitleTeacher
    : texts.rightTitle;
  const displayRightSubtitle = isTeacher
    ? texts.rightSubtitleTeacher
    : texts.rightSubtitle;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorText(texts.errorEmpty);
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);

    try {
      const response = await apiFetch("/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: username.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update username");
      }

      const profile = await refreshProfile();
      const role = profile?.role?.toLowerCase();

      if (role === "teacher") {
        navigate("/register-success", { replace: true });
      } else {
        navigate("/register-preferences", { replace: true });
      }
    } catch (err) {
      setErrorText(
        err instanceof Error
          ? err.message
          : "Failed to save username. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <AuthPageSeo
        title={texts.seoTitle}
        description={texts.seoDesc}
        path="/google-username"
      />
      <AuthSplitLayout
        progressStep={1}
        progressTotal={layoutProgressTotal}
        rightTitle={displayRightTitle}
        rightSubtitle={displayRightSubtitle}
      >
        <div className="mb-1 flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}Icon.svg`} className="w-15 h-18 mr-4" alt="Icon" />
          <h1 className="font-display text-2xl font-bold">{displayTitle}</h1>
        </div>
        <p className="mb-8 text-muted-foreground">{displayLead}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <LabelRegister isRequired={true}>{displayLabel}</LabelRegister>
            <InputText
              name="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errorText) setErrorText(null);
              }}
              type="text"
              placeholder={displayPlaceholder}
              maxLength={50}
            />
          </div>

          {errorText && <ValidateError>{errorText}</ValidateError>}

          <Button
            disabled={isSubmitting || !username.trim()}
            className="w-full rounded-xl bg-primary px-6 py-4 mt-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            type="submit"
          >
            {isSubmitting ? texts.saving : texts.btnSubmit}
            {!isSubmitting && <ArrowRight className="size-4" />}
          </Button>
        </form>
      </AuthSplitLayout>
    </>
  );
}
