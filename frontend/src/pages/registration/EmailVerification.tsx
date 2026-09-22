import React, { useState, useEffect } from "react";
import { useLocation, useNavigate,} from "react-router";
import {
  setStoredAccessToken,
  apiFetch,
  readApiErrorBody,
} from "../../lib/api";
import { maskEmail } from "../../lib/formatters";
import { AuthSplitLayout } from "../../components/AuthSplitLayout";
import { AuthPageSeo } from "../../lib/authPageSeo";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { formatMessage } from "../../lib/formatMessage";
import InputText from "../../components/InputText";
import LabelRegister from "../../components/LabelRegister";
import Button from "../../components/Button";
import toast from "react-hot-toast";
import { useUser } from "../../context/UserContext";
import { userMayUseLearnerApp } from "../../lib/subscriptionAccess";
import type { GeneratedStudentAccount } from "../../lib/registerUser";

type EmailVerificationLocationState = {
  email?: string;
  isLoginFlow?: boolean;
  generatedStudents?: GeneratedStudentAccount[];
};

export const EmailVerification: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshProfile } = useUser();
  const { messages } = useLandingLocale();
  const verify = messages.auth.emailVerification;

  const routeState = location.state as EmailVerificationLocationState | null;
  const email = routeState?.email || "";

  const [code, setCode] = useState("");
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(59);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  useEffect(() => {
    if (!email) {
      navigate("/register");
    }
  }, [email, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setErrorText(verify.codeRequired);
      return;
    }

    setErrorText("");
    setLoading(true);

    try {
      const response = await apiFetch("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });

      if (response.ok) {
        const data = await response.json();

        setStoredAccessToken(data.access_token);

        const profile = await refreshProfile();

        const isLoginFlow = routeState?.isLoginFlow;
        if (isLoginFlow) {
          toast.success(verify.verifiedWelcomeBack);
        }

        if (!profile) {
          navigate("/subscribe", { replace: true });
          return;
        }
        const savedStudents = routeState?.generatedStudents || [];
        if (savedStudents.length > 0) {
          navigate("/register-success", {
            state: { generatedStudents: savedStudents },
          });
          return;
        }
        if (
          !profile.role ||
          profile.role === "choose" ||
          profile.role === "regular" ||
          (!profile.englishLevel && !profile.hasCompletedPlacement)
        ) {
          navigate("/register-details");
          return;
        }

        if (profile.role === "admin") {
          navigate("/admin", { replace: true });
          return;
        }
        if (profile.role === "teacher") {
          navigate("/catalog", { replace: true });
          return;
        }

        if (!profile.subscriptionPlan && !profile.subscriptionStatus) {
          navigate("/subscribe", { replace: true });
          return;
        }

        if (
          !profile.englishLevel ||
          profile.englishLevel === "choose" ||
          profile.englishLevel === ""
        ) {
          navigate("/catalog", { replace: true });
          return;
        }

        if (!profile.hasCompletedPlacement) {
          navigate("/catalog", { replace: true });
          return;
        }

        if (userMayUseLearnerApp(profile)) {
          navigate("/catalog", { replace: true });
        } else {
          navigate("/subscribe", { replace: true });
        }
      } else {
        // ... (дальше твой старый код без изменений)
        const errorMsg = await readApiErrorBody(response);
        setErrorText(errorMsg || verify.invalidCode);
      }
    } catch {
      setErrorText(verify.connectionError);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setErrorText("");
    setResendMessage("");

    try {
      const response = await apiFetch("/auth/resend-confirmation", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        setResendMessage(verify.resendSuccess);
        setTimer(59);
      } else {
        const errorMsg = await readApiErrorBody(response);
        setErrorText(errorMsg || verify.resendFailed);
      }
    } catch {
      setErrorText(verify.resendError);
    }
  };

  return (
    <>
      <AuthPageSeo
        title={verify.title}
        description={verify.rightSubtitle}
        path="/verify-email"
      />
      <AuthSplitLayout
        rightTitle={verify.rightTitle}
        rightSubtitle={verify.rightSubtitle}
      >
        <div className="mb-2 flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}Icon.svg`} className="w-12 h-15" alt="Logo" />
          <h1 className="font-display text-2xl font-bold">{verify.title}</h1>
        </div>

        <p className="mb-1 text-sm text-muted-foreground">
          {verify.leadPrefix} <br />
          <span className="font-medium text-primary">{maskEmail(email)}</span>
        </p>

        <p className="mb-8 text-sm">{verify.spamText}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {errorText && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-in fade-in zoom-in-95 duration-200">
              {errorText}
            </div>
          )}
          {resendMessage && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-medium animate-in fade-in zoom-in-95 duration-200">
              {resendMessage}
            </div>
          )}

          <div className="space-y-2">
            <LabelRegister isRequired={true}>
              {verify.verificationCode}
            </LabelRegister>
            <InputText
              name="code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                if (errorText) setErrorText("");
              }}
              type="text"
              placeholder={verify.placeholder}
              className="text-center text-2xl tracking-[0.5em]"
              autoComplete="one-time-code"
              disabled={loading}
            />
          </div>

          <div className="flex justify-center pt-2">
            {timer > 0 ? (
              <p className="text-sm text-muted-foreground">
                {formatMessage(verify.resendIn, { seconds: String(timer) })}
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="text-sm text-muted-foreground hover:text-primary transition-colors underline"
              >
                {verify.resendCode}
              </button>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full rounded-xl bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? verify.verifying : verify.verifyCode}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-8 inline-block text-center text-sm text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
        >
          {verify.backToRegistration}
        </button>
      </AuthSplitLayout>
    </>
  );
};
