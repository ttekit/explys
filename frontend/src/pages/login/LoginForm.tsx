import Button from "../../components/Button";
import InputText from "../../components/InputText";
import LabelRegister from "../../components/LabelRegister";
import ValidateError from "../../components/ValidateError";
import { useState, ChangeEvent, FormEvent, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import Turnstile from "react-turnstile";
import { apiFetch, getApiBase, setStoredAccessToken } from "../../lib/api";
import { useUser } from "../../context/UserContext";
import { resolvePostLoginPath } from "../../lib/learnerOnboarding";
import { AuthSplitLayout } from "../../components/AuthSplitLayout";
import { AuthPageSeo } from "../../lib/authPageSeo";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { consumePendingRegistrationLoginWelcome } from "../../lib/registrationStorage";
import { maskEmail } from "../../lib/formatters";

function safeReturnPath(state: unknown): string | undefined {
  if (!state || typeof state !== "object" || !("from" in state))
    return undefined;
  const raw = (state as { from?: unknown }).from;
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  if (!raw.startsWith("/") || raw.startsWith("//")) return undefined;
  if (raw === "/login" || raw.startsWith("/login?")) return undefined;
  return raw;
}

export default function LoginForm() {
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState<number>(0);
  const [emptyError, setEmptyError] = useState(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { refreshProfile } = useUser();
  const { messages } = useLandingLocale();
  const loginSeo = messages.auth.login;

  useEffect(() => {
    const s = location.state as {
      registrationComplete?: boolean;
      from?: string;
    } | null;
    if (!s?.registrationComplete) {
      return;
    }
    if (consumePendingRegistrationLoginWelcome()) {
      toast.success(loginSeo.toastAccountCreated);
    }
    navigate("/login", {
      replace: true,
      state: s.from ? { from: s.from } : undefined,
    });
  }, [location.state, navigate, loginSeo.toastAccountCreated]);

  const isEmpty = !show2FA
    ? [loginData.email, loginData.password].some((value) => value.trim() === "")
    : twoFactorCode.length !== 6;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("error") === "GoogleAccountNotFound") {
      toast.error(
        loginSeo.noAccount || "That user does not exist. Please sign up.",
      );
      navigate("/login", { replace: true });
    }
  }, [location.search, navigate, loginSeo]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!captchaToken) {
      toast.error(loginSeo.captchaWait);
      return;
    }

    if (!isEmpty) {
      setEmptyError(false);
      try {
        const endpoint = show2FA ? "/auth/verify-2fa" : "/auth/login";

        const bodyPayload = {
          ...loginData,
          captchaToken: captchaToken,
          ...(show2FA ? { code: twoFactorCode } : {}),
        };

        const response = await apiFetch(endpoint, {
          method: "POST",
          body: JSON.stringify(bodyPayload),
        });

        if (response.ok) {
          const data = await response.json();

          if (data.requiresTwoFactor) {
            setShow2FA(true);
            toast.success(loginSeo.verificationCodeSent);

            setCaptchaToken(null);
            setCaptchaKey((prev) => prev + 1);
            return;
          }

          const token = data.access_token;
          const fromState = safeReturnPath(location.state);

          if (!token) {
            await refreshProfile();
            const next = resolvePostLoginPath(null, fromState);
            toast.success(loginSeo.toastSignedIn);
            navigate(next);
          } else {
            setStoredAccessToken(token);
            await refreshProfile();

            toast.success(loginSeo.toastSignedIn);

            const next = fromState || "/catalog";
            navigate(next);
          }
        } else {
          const errorData = await response.json();

          setCaptchaToken(null);
          setCaptchaKey((prev) => prev + 1);

          if (errorData?.error === "EMAIL_NOT_VERIFIED") {
            toast.error(loginSeo.emailNotVerified);
          } else {
            toast.error(errorData?.message || loginSeo.toastSignInError);
          }
        }
      } catch {
        setCaptchaToken(null);
        setCaptchaKey((prev) => prev + 1);
        toast.error(loginSeo.networkError);
      }
    } else {
      setEmptyError(true);
    }
  };

  return (
    <>
      <AuthPageSeo
        title={loginSeo.seoTitle}
        description={loginSeo.seoDescription}
        path="/login"
      />
      <AuthSplitLayout
        rightTitle={loginSeo.rightTitle}
        rightSubtitle={loginSeo.rightSubtitle}
      >
        <div className="mb-2 flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}Icon.svg`} className="w-12 h-15" alt="Logo" />
          <h1 className="font-display text-2xl font-bold">
            {loginSeo.welcomeBack}
          </h1>
        </div>
        <p className="mb-8 text-muted-foreground">{loginSeo.lead}</p>

        <form onSubmit={handleLogin} tabIndex={0} className="space-y-5">
          {!show2FA ? (
            <>
              <div className="space-y-2">
                <LabelRegister isRequired={true}>
                  {loginSeo.email}
                </LabelRegister>
                <InputText
                  name="email"
                  value={loginData.email}
                  onChange={handleChange}
                  type="email"
                  placeholder={loginSeo.placeholderEmail}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <LabelRegister isRequired={true}>
                    {loginSeo.password}
                  </LabelRegister>
                  <Link
                    to="#"
                    className="text-sm text-primary hover:underline"
                    onClick={(e) => e.preventDefault()}
                  >
                    {loginSeo.forgotPassword}
                  </Link>
                </div>
                <div className="relative">
                  <InputText
                    name="password"
                    value={loginData.password}
                    onChange={handleChange}
                    type={showPassword ? "text" : "password"}
                    placeholder={loginSeo.placeholderPassword}
                    autoComplete="current-password"
                    className="pr-12"
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword
                        ? loginSeo.hidePassword
                        : loginSeo.showPassword
                    }
                    aria-pressed={showPassword}
                    className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <EyeOff className="hover:cursor-pointer size-5 opacity-70" />
                    ) : (
                      <Eye className="hover:cursor-pointer size-5 opacity-70" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground">
                  {loginSeo.twoFactorLeadPrefix} <br />
                  <span className="font-medium text-primary">
                    {maskEmail(loginData.email)}
                  </span>
                </p>
              </div>

              <div className="space-y-2">
                <LabelRegister isRequired={true}>
                  {loginSeo.twoFactorTitle}
                </LabelRegister>
                <InputText
                  name="twoFactorCode"
                  value={twoFactorCode}
                  onChange={(e) =>
                    setTwoFactorCode(
                      e.target.value.replace(/\D/g, "").slice(0, 6),
                    )
                  }
                  type="text"
                  placeholder={loginSeo.twoFactorPlaceholder}
                  className="text-center text-2xl tracking-[0.5em]"
                  autoComplete="one-time-code"
                />
              </div>

              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShow2FA(false);
                    setTwoFactorCode("");
                  }}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {loginSeo.backToLogin}
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-center py-2">
            <Turnstile
              key={captchaKey}
              sitekey="0x4AAAAAADSk3etSiWLwGH5-"
              onVerify={(token) => setCaptchaToken(token)}
              onLoad={() => console.log("Turnstile loaded")}
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

          {emptyError && (
            <ValidateError>
              {show2FA ? loginSeo.codeRequired : loginSeo.fillRequired}
            </ValidateError>
          )}

          <Button
            type="submit"
            disabled={
              !captchaToken || (show2FA ? twoFactorCode.length !== 6 : false)
            }
            className="w-full rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 shadow-sm"
          >
            {show2FA ? loginSeo.verifyCode : loginSeo.submit}
          </Button>

          {/*google*/}
          {!show2FA && (
            <>
              <div className="flex items-center gap-4 py-2">
                <div className="h-[1px] flex-1 bg-[#2a2b36]"></div>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  {loginSeo.orContinueWith}
                </span>
                <div className="h-[1px] flex-1 bg-[#2a2b36]"></div>
              </div>

              <button
                type="button"
                onClick={() => {
                  window.location.href = `${getApiBase()}/auth/oauth/connect/google?action=login`;
                }}
                className="w-full flex items-center justify-center gap-3 rounded-[15px] bg-white px-6 py-3.5 text-sm font-semibold text-black hover:bg-gray-200 transition-all shadow-md"
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
                {loginSeo.google}
              </button>
            </>
          )}
        </form>

        {!show2FA && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {loginSeo.noAccount}{" "}
            <Link
              to="/register"
              className="font-medium text-primary hover:underline"
            >
              {loginSeo.signUp}
            </Link>
          </p>
        )}

        <Link
          to="/"
          className="mt-8 inline-block text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {loginSeo.backHome}
        </Link>
      </AuthSplitLayout>
    </>
  );
}
