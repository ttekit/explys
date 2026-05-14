import Button from "../../components/Button";
import InputText from "../../components/InputText";
import LabelRegister from "../../components/LabelRegister";
import ValidateError from "../../components/ValidateError";
import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import {
  apiFetch,
  getResponseErrorMessage,
  setStoredAccessToken,
} from "../../lib/api";
import { useUser } from "../../context/UserContext";
import { AuthSplitLayout } from "../../components/AuthSplitLayout";
import { consumePendingRegistrationLoginWelcome } from "../../lib/registrationStorage";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { SEO } from "../../components/SEO/SEO";
import { resolveCanonicalUrl } from "../../lib/siteUrl";

function safeReturnPath(state: unknown): string | undefined {
  if (!state || typeof state !== "object" || !("from" in state))
    return undefined;
  const raw = (state as { from?: unknown }).from;
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  if (!raw.startsWith("/") || raw.startsWith("//")) return undefined;
  if (raw === "/loginForm" || raw.startsWith("/loginForm?")) return undefined;
  return raw;
}

export default function LoginForm() {
  const { messages, locale } = useLandingLocale();
  const t = messages.auth.login;
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });
  const [emptyError, setEmptyError] = useState(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProfile } = useUser();

  useEffect(() => {
    const s = location.state as {
      registrationComplete?: boolean;
      from?: string;
    } | null;
    if (!s?.registrationComplete) {
      return;
    }
    if (consumePendingRegistrationLoginWelcome()) {
      toast.success(t.toastAccountCreated);
    }
    navigate("/loginForm", {
      replace: true,
      state: s.from ? { from: s.from } : undefined,
    });
  }, [location.state, navigate, t.toastAccountCreated]);

  const isEmpty = [loginData.email, loginData.password].some(
    (value) => value.trim() === "",
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isEmpty) {
      setEmptyError(false);
      try {
        const response = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify(loginData),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            access_token?: string;
          };
          const token = data.access_token;
          const next = safeReturnPath(location.state) ?? "/catalog";
          if (!token) {
            toast.success(t.toastSignedIn);
            navigate(next);
          } else {
            setStoredAccessToken(token);
            await refreshProfile();
            toast.success(t.toastSignedIn);
            navigate(next);
          }
        } else {
          const message = await getResponseErrorMessage(response);
          if (message.includes("Email not verified")) {
            navigate("/email-confirmation", {
              state: { email: loginData.email },
            });
            return;
          }
          toast.error(message);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t.toastSignInError;
        toast.error(message);
      }
    } else {
      setEmptyError(true);
    }
  };

  return (
    <>
      <SEO
        title={t.seoTitle}
        description={t.seoDescription}
        canonicalUrl={resolveCanonicalUrl("/loginForm")}
        noindex
        ogLocale={locale === "uk" ? "uk_UA" : "en_US"}
      />
      <div lang={locale === "uk" ? "uk" : "en"}>
        <AuthSplitLayout
          rightTitle={t.rightTitle}
          rightSubtitle={t.rightSubtitle}
        >
          <div className="mb-2 flex items-center gap-3">
            <img src="/Icon.svg" className="w-12 h-15" alt="" />
            <h1 className="font-display text-2xl font-bold">{t.welcomeBack}</h1>
          </div>
          <p className="mb-8 text-muted-foreground">{t.lead}</p>

          <form onSubmit={handleLogin} tabIndex={0} className="space-y-5">
            <div className="space-y-2">
              <LabelRegister isRequired={true}>{t.email}</LabelRegister>
              <InputText
                name="email"
                value={loginData.email}
                onChange={handleChange}
                type="email"
                placeholder={t.placeholderEmail}
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <LabelRegister isRequired={true}>{t.password}</LabelRegister>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  {t.forgotPassword}
                </Link>
              </div>
              <div className="relative">
                <InputText
                  name="password"
                  value={loginData.password}
                  onChange={handleChange}
                  type={showPassword ? "text" : "password"}
                  placeholder={t.placeholderPassword}
                  autoComplete="current-password"
                  className="pr-12"
                />
                <button
                  type="button"
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                  aria-pressed={showPassword}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? (
                    <EyeOff className="size-5 opacity-70" />
                  ) : (
                    <Eye className="size-5 opacity-70" />
                  )}
                </button>
              </div>
            </div>

            {emptyError && <ValidateError>{t.fillRequired}</ValidateError>}

            <Button
              type="submit"
              className="rounded-[15px] bg-primary px-6 py-4 text-sm font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]"
            >
              {t.submit}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t.noAccount}{" "}
            <Link
              to="/registrationMain"
              className="font-medium text-primary hover:underline"
            >
              {t.signUp}
            </Link>
          </p>

          <Link
            to="/"
            className="mt-8 inline-block text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t.backHome}
          </Link>
        </AuthSplitLayout>
      </div>
    </>
  );
}
