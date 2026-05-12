import InputText from "../../components/InputText";
import Button from "../../components/Button";
import ValidateError from "../../components/ValidateError";
import LabelRegister from "../../components/LabelRegister";
import { Link, useNavigate } from "react-router";
import { useContext, useState, ChangeEvent, FormEvent } from "react";
import { RegistrationContext } from "../../context/RegistrationContext";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { AuthSplitLayout } from "../../components/AuthSplitLayout";
import { SEO } from "../../components/SEO/SEO";
import { resolveCanonicalUrl } from "../../lib/siteUrl";
import { useLandingLocale } from "../../context/LandingLocaleContext";

export default function RegistrationMain() {
  const { messages, locale } = useLandingLocale();
  const t = messages.auth.registration.step1;
  const err = messages.auth.registration.errors;
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);
  const navigate = useNavigate();

  const isValidPassword = (p: string) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(p);

  const validateField = (
    value: string,
    type: "password" | "email" | "confirmPassword" | "other",
    passwordToCompare?: string,
  ) => {
    if (type === "password") {
      if (value.length < 8) {
        setErrorText(err.passwordMin8);
        return false;
      }
      if (!/[A-Z]/.test(value)) {
        setErrorText(err.passwordUpper);
        return false;
      }
      if (!/[a-z]/.test(value)) {
        setErrorText(err.passwordLower);
        return false;
      }
      if (!/\d/.test(value)) {
        setErrorText(err.passwordNumber);
        return false;
      }
      if (!/[@$!%*?&]/.test(value)) {
        setErrorText(err.passwordSpecial);
        return false;
      }
    }

    if (type === "confirmPassword") {
      const pw = passwordToCompare ?? formData.password;
      if (value !== pw) {
        setErrorText(err.passwordsNoMatch);
        return false;
      }
    }

    if (type === "email") {
      if (!/^\S+@\S+\.\S+$/.test(value)) {
        setErrorText(err.emailInvalid);
        return false;
      }
    }

    if (type === "other") {
      if (value.trim() === "") {
        setErrorText(err.fillRequired);
        return false;
      }
    }

    setErrorText(null);
    return true;
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement>,
    type: "password" | "email" | "confirmPassword" | "other",
  ) => {
    const { value } = e.target;
    const name = e.target.name as keyof typeof formData & string;
    updateFormData({ [name]: value } as Record<string, string>);

    const passFromForm =
      e.currentTarget.form?.querySelector<HTMLInputElement>(
        'input[name="password"]',
      )?.value ?? formData.password;
    if (type === "confirmPassword") {
      validateField(value, "confirmPassword", passFromForm);
    } else {
      validateField(value, type);
    }
  };

  const handleNext = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const confirmPassword = String(fd.get("confirmPassword") ?? "");
    updateFormData({ name, email, password, confirmPassword });

    if (!name) {
      setErrorText(err.usernameRequired);
      return;
    }
    if (!email) {
      setErrorText(err.emailRequired);
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErrorText(err.emailInvalid);
      return;
    }
    if (!password) {
      setErrorText(err.passwordRequired);
      return;
    }
    if (!isValidPassword(password)) {
      if (password.length < 8) {
        setErrorText(err.passwordMin8);
        return;
      }
      if (!/[A-Z]/.test(password)) {
        setErrorText(err.passwordUpper);
        return;
      }
      if (!/[a-z]/.test(password)) {
        setErrorText(err.passwordLower);
        return;
      }
      if (!/\d/.test(password)) {
        setErrorText(err.passwordNumber);
        return;
      }
      if (!/[@$!%*?&]/.test(password)) {
        setErrorText(err.passwordSpecial);
        return;
      }
      setErrorText(err.passwordWeak);
      return;
    }
    if (!confirmPassword) {
      setErrorText(err.confirmRequired);
      return;
    }
    if (password !== confirmPassword) {
      setErrorText(err.passwordsNoMatch);
      return;
    }
    setErrorText(null);
    //navigate("/registrationDetails");
    try {
      const response = await fetch("http://localhost:4200/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          passwordRepeat: confirmPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrorText(result.message || "Помилка реєстрації");
        return;
      }

      if (result.access_token) {
        localStorage.setItem("accessToken", result.access_token);
      }
      navigate("/email-confirmation", { state: { email } });
    } catch (error) {
      console.error("Помилка:", error);
      setErrorText("Сервер не відповідає. Перевірте з'єднання.");
    }
  };

  const handleBack = () => {
    updateFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      englishLevel: "choose",
      hobbies: [],
      education: "",
      workField: "",
      favoriteGenres: [],
      hatedGenres: [],
      learningGoal: "",
      timeToAchieve: "",
    });
  };

  return (
    <>
      <SEO
        title={t.seoTitle}
        description={t.seoDescription}
        canonicalUrl={resolveCanonicalUrl("/registrationMain")}
        noindex
        ogLocale={locale === "uk" ? "uk_UA" : "en_US"}
      />
      <div lang={locale === "uk" ? "uk" : "en"}>
        <AuthSplitLayout
          progressStep={1}
          progressTotal={3}
          rightTitle={t.rightTitle}
          rightSubtitle={t.rightSubtitle}
        >
          <div className="mb-1 flex items-center gap-3">
            <img src="/Icon.svg" className="w-15 h-18 mr-4" alt="" />
            <h1 className="font-display text-2xl font-bold">{t.title}</h1>
          </div>
          <p className="mb-8 text-muted-foreground">{t.lead}</p>

          <form onSubmit={handleNext} tabIndex={0} className="space-y-5">
            <div className="space-y-2">
              <LabelRegister isRequired={true}>{t.username}</LabelRegister>
              <InputText
                name="name"
                value={formData.name}
                onChange={(e) => handleChange(e, "other")}
                type="text"
                placeholder={t.placeholderUsername}
                autoComplete="username"
              />
            </div>

            <div className="space-y-2">
              <LabelRegister isRequired={true}>{t.email}</LabelRegister>
              <InputText
                name="email"
                value={formData.email}
                onChange={(e) => handleChange(e, "email")}
                type="email"
                placeholder={t.placeholderEmail}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <LabelRegister isRequired={true}>{t.password}</LabelRegister>
                <button
                  type="button"
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                  aria-pressed={showPassword}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeOff className="size-5 opacity-70" />
                  ) : (
                    <Eye className="size-5 opacity-70" />
                  )}
                </button>
              </div>
              <InputText
                name="password"
                value={formData.password}
                onChange={(e) => handleChange(e, "password")}
                type={showPassword ? "text" : "password"}
                placeholder={t.placeholderPassword}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <LabelRegister isRequired={true}>
                  {t.confirmPassword}
                </LabelRegister>
                <button
                  type="button"
                  aria-label={
                    showConfirmPassword
                      ? t.hideConfirmPassword
                      : t.showConfirmPassword
                  }
                  aria-pressed={showConfirmPassword}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="size-5 opacity-70" />
                  ) : (
                    <Eye className="size-5 opacity-70" />
                  )}
                </button>
              </div>
              <InputText
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={(e) => handleChange(e, "confirmPassword")}
                type={showConfirmPassword ? "text" : "password"}
                placeholder={t.placeholderConfirm}
                autoComplete="new-password"
              />
            </div>

            {errorText && <ValidateError>{errorText}</ValidateError>}

            <Button
              type="submit"
              className="rounded-[15px] bg-primary px-6 py-4 text-sm font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]"
            >
              {t.continue}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="mt-6 flex flex-col gap-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              onClick={handleBack}
            >
              <ArrowLeft className="size-4" />
              {t.backHome}
            </Link>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t.haveAccount}{" "}
            <Link
              to="/loginForm"
              className="font-medium text-primary hover:underline"
            >
              {t.logIn}
            </Link>
          </p>
        </AuthSplitLayout>
      </div>
    </>
  );
}
