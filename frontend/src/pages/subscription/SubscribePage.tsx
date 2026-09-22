import { useEffect } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router";
import toast from "react-hot-toast";
import PricingCards from "../../components/pricing/PricingCards";
import { usePricingCheckout } from "../../hooks/usePricingCheckout";
import { useUser } from "../../context/UserContext";
import {
  subscriptionDevModeEnabled,
  subscriptionEnforcementDisabled,
  userMayUseLearnerApp,
} from "../../lib/subscriptionAccess";
import { SEO } from "../../components/SEO/SEO";
import { resolveCanonicalUrl } from "../../lib/siteUrl";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { useAppMessages } from "../../hooks/useAppMessages";
import { formatMessage } from "../../lib/formatMessage";
import { consumePendingRegistrationLoginWelcome } from "../../lib/registrationStorage";
import type { GeneratedStudentAccount } from "../../lib/registerUser";

type SubscribePageLocationState = {
  isTeacherRegistration?: boolean;
  generatedStudents?: GeneratedStudentAccount[];
};

export default function SubscribePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading, logout } = useUser();
  const { startCheckout, checkoutLoading } = usePricingCheckout();
  const { locale, messages } = useLandingLocale();
  const sub = useAppMessages().subscription;
  const toastAccountCreated = messages.auth.login.toastAccountCreated;

  const state = location.state as SubscribePageLocationState | null;
  const isTeacherRegistration = state?.isTeacherRegistration;
  const generatedStudents = state?.generatedStudents;

  const devSkip = subscriptionEnforcementDisabled();
  const devSkipBannerDetail = (() => {
    if (!devSkip) {
      return "";
    }
    if (subscriptionDevModeEnabled()) {
      return import.meta.env.DEV ? "vite dev · DEV_MODE=1" : "DEV_MODE=1";
    }
    return "VITE_SKIP_SUBSCRIPTION_ENFORCEMENT";
  })();

  useEffect(() => {
    if (devSkip) return;

    if (isLoading) return;

    if (isTeacherRegistration) return;

    const checkoutDone = searchParams.get("checkout") === "success";

    if (user && userMayUseLearnerApp(user)) {
      if (checkoutDone) {
        toast.success(sub.thankYouSubscribing);
      }
      navigate("/catalog", { replace: true });
      return;
    }

    if (checkoutDone) {
      navigate("/catalog", { replace: true });
    }
  }, [
    devSkip,
    isLoading,
    navigate,
    searchParams,
    user,
    isTeacherRegistration,
    sub.thankYouSubscribing,
  ]);

  useEffect(() => {
    if (!consumePendingRegistrationLoginWelcome()) {
      return;
    }
    toast.success(toastAccountCreated);
  }, [toastAccountCreated]);

  return (
    <div className="min-h-screen bg-background font-display text-foreground antialiased">
      <SEO
        title={sub.seoTitle}
        description={sub.seoDescription}
        canonicalUrl={resolveCanonicalUrl("/subscribe")}
        ogLocale={locale === "uk" ? "uk_UA" : "en_US"}
        ogLocaleAlternate={locale === "uk" ? "en_US" : "uk_UA"}
        noindex
      />
      <main className="mx-auto box-border flex min-h-screen w-full max-w-[1536px] flex-col px-4 pb-24 pt-12 sm:w-[92%] sm:px-6 sm:pt-16 md:w-[88%] lg:w-[80%]">
        <div className="mb-10 flex flex-col gap-6 text-center">
          <div className="flex justify-center gap-3">
            <img src={`${import.meta.env.BASE_URL}Icon.svg`} alt="" className="h-14 w-12" />
            <span className="font-display flex items-center text-xl font-bold tracking-tight">
              Explys
            </span>
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {sub.title}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground text-lg">
              {sub.subtitle}
            </p>
          </div>
          {devSkip ? (
            <p
              className="mx-auto max-w-lg rounded-xl border border-primary/35 bg-primary/10 px-4 py-3 text-primary text-sm"
              role="status"
            >
              {formatMessage(sub.devModeBanner, {
                env: devSkipBannerDetail,
              })}
            </p>
          ) : null}
        </div>

        {!devSkip ? (
          <>
            <PricingCards
              onlyPlanId={isTeacherRegistration ? "teacher" : undefined}
              defaultPlanId="smart"
              onSelectTeacherPlan={
                isTeacherRegistration
                  ? () =>
                      navigate("/register-success", {
                        state: { generatedStudents },
                      })
                  : undefined
              }
              onSelectConsumerPlan={(id) =>
                void startCheckout(id, { isLoggedIn: !!user })
              }
              checkoutDisabled={checkoutLoading}
              className={
                isTeacherRegistration
                  ? ""
                  : "mx-auto w-full !grid-cols-1 md:!grid-cols-2 xl:!grid-cols-4 xl:gap-6"
              }
            />
            <p className="mx-auto mt-10 max-w-md text-center text-muted-foreground text-xs">
              {sub.paymentsNote}
              <Link
                to="/pricing"
                className="text-primary underline-offset-4 hover:underline"
              >
                {sub.pricingLinkLabel}
              </Link>
              {sub.teacherPlanNote}
            </p>
          </>
        ) : (
          <Link
            to="/catalog"
            className=" flex rounded-[15px] bg-primary px-6 py-4 text-sm font-semibold items-center justify-center text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]"
          >
            {sub.continueCatalog}
          </Link>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-12 text-muted-foreground text-sm">
          {user && !userMayUseLearnerApp(user) && !isTeacherRegistration ? (
            <button
              type="button"
              className="hover:text-foreground underline-offset-4 hover:underline"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              {sub.signOut}
            </button>
          ) : null}
          {!isTeacherRegistration && (
            <Link
              to="/pricing"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              {sub.comparePlans}
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
