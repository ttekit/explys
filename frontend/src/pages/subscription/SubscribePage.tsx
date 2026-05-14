import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router";
import PricingCards from "../../components/pricing/PricingCards";
import { usePricingCheckout } from "../../hooks/usePricingCheckout";
import { useUser } from "../../context/UserContext";
import {
  subscriptionEnforcementDisabled,
  userMayUseLearnerApp,
} from "../../lib/subscriptionAccess";
import { SEO } from "../../components/SEO/SEO";
import { resolveCanonicalUrl } from "../../lib/siteUrl";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import {
  resolveStripePublishableKey,
  stripeKeyMode,
} from "../../lib/stripePublishable";

export default function SubscribePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading, logout } = useUser();
  const { startCheckout, checkoutLoading } = usePricingCheckout();
  const { locale } = useLandingLocale();
  const [stripeMode, setStripeMode] = useState<"test" | "live" | null>(null);

  const devSkip = subscriptionEnforcementDisabled();

  useEffect(() => {
    if (devSkip) return;
    const checkoutDone = searchParams.get("checkout") === "success";
    if (isLoading) return;

    if (user && userMayUseLearnerApp(user)) {
      navigate(`/catalog${checkoutDone ? "?checkout=success" : ""}`, {
        replace: true,
      });
      return;
    }

    if (checkoutDone) {
      navigate("/catalog?checkout=success", { replace: true });
    }
  }, [devSkip, isLoading, navigate, searchParams, user]);

  useEffect(() => {
    void resolveStripePublishableKey().then((pk) =>
      setStripeMode(stripeKeyMode(pk)),
    );
  }, []);

  const title = useMemo(
    () => "Choose your plan · Explys",
    [],
  );

  return (
    <div className="min-h-screen bg-background font-display text-foreground antialiased">
      <SEO
        title={title}
        description="Subscribe to unlock every Explys lesson and placement flow."
        canonicalUrl={resolveCanonicalUrl("/subscribe")}
        ogLocale={locale === "uk" ? "uk_UA" : "en_US"}
        ogLocaleAlternate={locale === "uk" ? "en_US" : "uk_UA"}
        noindex
      />
      <main className="mx-auto box-border flex min-h-screen w-full max-w-[1536px] flex-col px-4 pb-24 pt-12 sm:w-[92%] sm:px-6 sm:pt-16 md:w-[88%] lg:w-[80%]">
        <div className="mb-10 flex flex-col gap-6 text-center">
          <div className="flex justify-center gap-3">
            <img src="/Icon.svg" alt="" className="h-14 w-12" />
            <span className="font-display flex items-center text-xl font-bold tracking-tight">
              Explys
            </span>
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Pick your subscription
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground text-lg">
              You need an active plan to open the catalog, lessons, and entry
              test. Choose Light, Smart, or Family — then continue learning.
            </p>
          </div>
          {stripeMode ?
            <p
              className={
                stripeMode === "test" ?
                  "mx-auto max-w-xl text-xs text-amber-600 dark:text-amber-400"
                : "mx-auto max-w-xl text-xs text-muted-foreground"
              }
              role="status"
            >
              {stripeMode === "test" ?
                "Stripe is in test mode (no real charges)."
              : "Stripe live mode."}
            </p>
          : null}
          {devSkip ?
            <p
              className="mx-auto max-w-lg rounded-xl border border-primary/35 bg-primary/10 px-4 py-3 text-primary text-sm"
              role="status"
            >
              Dev mode: subscription enforcement is off (
              <code className="font-mono text-xs">VITE_SKIP_SUBSCRIPTION_ENFORCEMENT</code>
              ).
            </p>
          : null}
        </div>

        {!devSkip ?
          <>
            <PricingCards
              onSelectConsumerPlan={(id) =>
                void startCheckout(id, { isLoggedIn: !!user })}
              checkoutDisabled={checkoutLoading}
              className="mx-auto w-full !grid-cols-1 md:!grid-cols-2 xl:!grid-cols-4 xl:gap-6"
            />
            <p className="mx-auto mt-10 max-w-md text-center text-muted-foreground text-xs">
              Payments via Stripe. For schools and teams see{" "}
              <Link
                to="/pricing"
                className="text-primary underline-offset-4 hover:underline"
              >
                pricing
              </Link>
              {" "}
              or contact sales from the Teacher plan card.
            </p>
          </>
        : (
          <Link
            to="/catalog"
            className="mx-auto rounded-xl bg-primary px-8 py-3 font-semibold text-primary-foreground"
          >
            Continue to catalog
          </Link>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-12 text-muted-foreground text-sm">
          <button
            type="button"
            className="hover:text-foreground underline-offset-4 hover:underline"
            onClick={() => {
              logout();
              navigate("/loginForm");
            }}
          >
            Sign out
          </button>
          <Link
            to="/pricing"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Compare plans publicly
          </Link>
        </div>
      </main>
    </div>
  );
}
