import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router";
import { AuthSplitLayout } from "../../components/AuthSplitLayout";
import { AuthPageSeo } from "../../lib/authPageSeo";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import Button from "../../components/Button";
import { apiFetch } from "../../lib/api";

export default function RestoreAccount() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { messages } = useLandingLocale();
  const restore = messages.auth.restoreAccount;

  const [status, setStatus] = useState<"loading" | "success" | "error">(() =>
    token ? "loading" : "error",
  );
  const [message, setMessage] = useState(() =>
    token ? "" : restore.errorMissingToken,
  );

  const hasFetched = useRef(false);

  useEffect(() => {
    if (!token) return;

    if (hasFetched.current) return;
    hasFetched.current = true;

    const restoreUser = async () => {
      try {
        const response = await apiFetch("/auth/restore-account", {
          method: "POST",
          body: JSON.stringify({ token }),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          setStatus("success");
          setMessage(data.message || restore.successDefault);
        } else {
          setStatus("error");
          setMessage(data.message || restore.errorInvalidLink);
        }
      } catch {
        setStatus("error");
        setMessage(restore.errorConnection);
      }
    };

    void restoreUser();
  }, [token, restore]);

  return (
    <>
      <AuthPageSeo
        title={restore.seoTitle}
        description={restore.seoDescription}
        path="/restore-account"
      />
      <AuthSplitLayout
        rightTitle={restore.rightTitle}
        rightSubtitle={restore.rightSubtitle}
      >
        <div className="mb-8 flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}Icon.svg`} className="w-12 h-15" alt="Logo" />
          <h1 className="font-display text-2xl font-bold">{restore.title}</h1>
        </div>

        <div className="space-y-6">
          {status === "loading" && (
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 text-sm font-medium animate-pulse">
              {restore.loading}
            </div>
          )}

          {status === "success" && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-medium animate-in fade-in zoom-in-95 duration-200">
              {message}
            </div>
          )}

          {status === "error" && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm font-medium animate-in fade-in zoom-in-95 duration-200">
              {message}
            </div>
          )}

          <div className="pt-4">
            <Link to="/login" className="block w-full">
              <Button
                type="button"
                className="w-full rounded-[15px] bg-primary px-6 py-4 text-sm font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]"
              >
                {restore.goToLogin}
              </Button>
            </Link>
          </div>
        </div>
      </AuthSplitLayout>
    </>
  );
}
