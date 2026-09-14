import InputText from "../../components/InputText";
import Button from "../../components/Button";
import ValidateError from "../../components/ValidateError";
import LabelRegister from "../../components/LabelRegister";
import { Link, useNavigate, useLocation } from "react-router";
import { useContext, useState, ChangeEvent, FormEvent } from "react";
import { RegistrationContext } from "../../context/RegistrationContext";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { AuthSplitLayout } from "../../components/AuthSplitLayout";
import { AuthPageSeo } from "../../lib/authPageSeo";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import Turnstile from "react-turnstile";
import { registerUser } from "../../lib/registerUser";
import { apiFetch, getApiBase, setStoredAccessToken } from "../../lib/api";
import {
  DEFAULT_LEARNING_GOAL,
  DEFAULT_TIME_HORIZON,
} from "../../lib/learningPlan";
import { persistRegistrationSession } from "../../lib/registrationSession";
import { restoreRegistrationAccessToken } from "../../lib/registrationSession";
import { useEffect } from "react";
import { useUser } from "../../context/UserContext";
import { Error404Page } from "../Error404Page";

export default function RegistrationMain() {
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { messages } = useLandingLocale();
  const step1 = messages.auth.registration.step1;
  const errors = messages.auth.registration.errors;

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState<number>(0);

  const { formData, updateFormData } = context;
  const [errorText, setErrorText] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);

  const navigate = useNavigate();
  const location = useLocation();

  const path = location.pathname.toLowerCase();
  let urlRole = "adult";

  if (path.includes("teacher")) {
    urlRole = "teacher";
  } else if (path.includes("adult")) {
    urlRole = "adult";
  }

  useEffect(() => {
    if (formData.role !== urlRole) {
      updateFormData({ role: urlRole });
    }
  }, [urlRole, formData.role, updateFormData]);
  
  const isTeacher = urlRole === "teacher";
  const layoutProgressTotal = isTeacher ? 2 : 3;

  const layoutRightTitle = isTeacher
    ? step1.rightTitleTeacher
    : step1.rightTitle;

  const layoutRightSubtitle = isTeacher
    ? step1.rightSubtitleTeacher
    : step1.rightSubtitle;

  const { refreshProfile } = useUser();
  const isValidPassword = (p: string) =>
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&\-]).{8,}$/.test(p);

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setCaptchaKey((prev) => prev + 1);
  };

  const validateField = (
    value: string,
    type: "password" | "email" | "confirmPassword" | "other",
    passwordToCompare?: string,
  ) => {
    if (type === "password") {
      setErrorText(null);
      return isValidPassword(value);
    }

    if (type === "confirmPassword") {
      const pw = passwordToCompare ?? formData.password;
      if (value !== pw) {
        setErrorText(errors.passwordsNoMatch);
        return false;
      }
    }

    if (type === "email") {
      if (!/^\S+@\S+\.\S+$/.test(value)) {
        setErrorText(errors.emailInvalid);
        return false;
      }
    }

    if (type === "other") {
      if (value.trim() === "") {
        setErrorText(errors.fillRequired);
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

    if (type === "email") {
      if (errorText === errors.emailInvalid) {
        setErrorText(null);
      }
      return;
    }

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

    if (!name) {
      setErrorText(errors.usernameRequired);
      resetCaptcha();
      return;
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setErrorText(errors.emailInvalid);
      resetCaptcha();
      return;
    }
    if (!password || !isValidPassword(password)) {
      setErrorText(errors.passwordWeak);
      resetCaptcha();
      return;
    }
    if (password !== confirmPassword) {
      setErrorText(errors.passwordsNoMatch);
      resetCaptcha();
      return;
    }
    if (!captchaToken) {
      setErrorText(errors.captchaWait);
      return;
    }

    setErrorText(null);

    try {
      localStorage.setItem("temp_email", email);
      persistRegistrationSession({ email, password });

      const result = await registerUser({
        ...formData,
        name,
        email,
        password,
        confirmPassword,
        token: captchaToken,
        role: urlRole.toUpperCase(),
      });

      if (!result.success) {
        const errMsg = Array.isArray(result.message)
          ? result.message.join(", ")
          : result.message;
        setErrorText(errMsg || errors.registrationFailed);
        resetCaptcha();
        return;
      }

      const token = result.accessToken || restoreRegistrationAccessToken();
      if (!token) {
        setErrorText(errors.registrationFailedRetry);
        resetCaptcha();
        return;
      }

      updateFormData({
        name,
        email,
        password,
        confirmPassword,
        token: captchaToken,
        role: urlRole,
      });

      if (urlRole === "teacher") {
        setStoredAccessToken(token);

        try {
          await apiFetch("/auth/update-preferences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              role: "TEACHER",
            }),
            token: token,
          });
        } catch (err) {
          console.warn("Не удалось принудительно обновить роль", err);
        }

        try {
          await refreshProfile();
        } catch (err) {
          console.warn("Профиль не обновился, но продолжаем редирект...", err);
        }
        navigate("/register-success", {
          replace: true,
          state: { generatedStudents: result.generatedStudents },
        });
      } else {
        navigate("/register-preferences");
      }
    } catch (error) {
      console.error("Error during registration:", error);
      setErrorText(errors.networkError);
      resetCaptcha();
    }
  };
  const handleGoogleRegister = () => {
    document.cookie = `oauth_role=${urlRole}; path=/; max-age=200`;
    window.location.href = `${getApiBase()}/auth/oauth/connect/google?action=register&role=${urlRole}`;
  };

  const handleBack = () => {
    updateFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      dateOfBirth: "",
      englishLevel: "choose",
      hobbies: [],
      education: "",
      workField: "",
      favoriteGenres: [],
      hatedGenres: [],
      learningGoal: DEFAULT_LEARNING_GOAL,
      timeToAchieve: DEFAULT_TIME_HORIZON,
    });
  };

  if (urlRole.toLowerCase() === "admin") {
    return <Error404Page />;
  }

  return (
    <>
      <AuthPageSeo
        title={step1.seoTitle}
        description={step1.seoDescription}
        path="/register"
      />
      <AuthSplitLayout
        progressStep={1}
        progressTotal={layoutProgressTotal}
        rightTitle={layoutRightTitle}
        rightSubtitle={layoutRightSubtitle}
      >
        <div className="mb-1 flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}Icon.svg`} className="w-15 h-18 mr-4" alt="Icon" />
          <h1 className="font-display text-2xl font-bold">{step1.title}</h1>
        </div>
        <p className="mb-8 text-muted-foreground">{step1.lead}</p>

        <form onSubmit={handleNext} tabIndex={0} className="space-y-5">
          <div className="space-y-2">
            <LabelRegister isRequired={true}>{step1.username}</LabelRegister>
            <InputText
              name="name"
              value={formData.name}
              onChange={(e) => handleChange(e, "other")}
              type="text"
              placeholder={step1.placeholderUsername}
              autoComplete="username"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <LabelRegister isRequired={true}>{step1.email}</LabelRegister>
            <InputText
              name="email"
              value={formData.email}
              onChange={(e) => handleChange(e, "email")}
              onBlur={(e) => {
                if (e.target.value.trim() !== "") {
                  validateField(e.target.value, "email");
                }
              }}
              type="email"
              placeholder={step1.placeholderEmail}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <LabelRegister isRequired={true}>{step1.password}</LabelRegister>
              <button
                type="button"
                aria-label={
                  showPassword ? step1.hidePassword : step1.showPassword
                }
                aria-pressed={showPassword}
                className="text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? (
                  <EyeOff className="hover:cursor-pointer size-5 opacity-70" />
                ) : (
                  <Eye className="hover:cursor-pointer size-5 opacity-70" />
                )}
              </button>
            </div>
            <InputText
              name="password"
              value={formData.password}
              onChange={(e) => handleChange(e, "password")}
              type={showPassword ? "text" : "password"}
              placeholder={step1.placeholderPassword}
              autoComplete="new-password"
            />

            {formData.password && !isValidPassword(formData.password) && (
              <div className="flex flex-col gap-1 mt-1.5 px-1 text-[12px] font-medium text-destructive">
                {formData.password.length < 8 && (
                  <span>• {errors.passwordMin8}</span>
                )}
                {!/[A-Z]/.test(formData.password) && (
                  <span>• {errors.passwordUpper}</span>
                )}
                {!/[a-z]/.test(formData.password) && (
                  <span>• {errors.passwordLower}</span>
                )}
                {!/\d/.test(formData.password) && (
                  <span>• {errors.passwordNumber}</span>
                )}
                {!/[@$!%*?&\-]/.test(formData.password) && (
                  <span>• {errors.passwordSpecial}</span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <LabelRegister isRequired={true}>
                {step1.confirmPassword}
              </LabelRegister>
              <button
                type="button"
                aria-label={
                  showConfirmPassword
                    ? step1.hideConfirmPassword
                    : step1.showConfirmPassword
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
              placeholder={step1.placeholderConfirm}
              autoComplete="new-password"
            />
          </div>

          {errorText && <ValidateError>{errorText}</ValidateError>}

          <div
            className="flex justify-center py-2"
            style={{ minHeight: "65px" }}
          >
            <Turnstile
              key={captchaKey}
              sitekey="0x4AAAAAADSk3etSiWLwGH5-"
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => {
                setCaptchaToken(null);
                setCaptchaKey((prev) => prev + 1);
              }}
              onError={() => {
                setCaptchaToken(null);
                setCaptchaKey((prev) => prev + 1);
              }}
              theme="light"
            />
          </div>

          <Button
            disabled={!captchaToken}
            className="w-full rounded-xl bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            type="submit"
          >
            {step1.continue}
            <ArrowRight className="size-4" />
          </Button>
          <div className="flex items-center gap-4 py-2">
            <div className="h-[1px] flex-1 bg-[#2a2b36]"></div>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {step1.orContinueWith}
            </span>
            <div className="h-[1px] flex-1 bg-[#2a2b36]"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleRegister}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-6 py-4 text-sm font-semibold text-black shadow-sm transition-colors hover:bg-gray-100 cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {step1.google}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={handleBack}
          >
            <ArrowLeft className="size-4" />
            {step1.backHome}
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {step1.haveAccount}{" "}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            {step1.logIn}
          </Link>
        </p>
      </AuthSplitLayout>
    </>
  );
}
