import { useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import ContentHeader from "../../components/catalog/ContentHeader";
import PricingCards from "../../components/pricing/PricingCards";
import { useUser } from "../../context/UserContext";
import { usePricingCheckout } from "../../hooks/usePricingCheckout";
import { SEO } from "../../components/SEO/SEO";
import { resolveCanonicalUrl } from "../../lib/siteUrl";
import { useLandingLocale } from "../../context/LandingLocaleContext";

export default function PricingPage() {
  const [searchParams] = useSearchParams();
  const { isLoggedIn } = useUser();
  const { startCheckout, checkoutLoading } = usePricingCheckout();
  const { messages, locale } = useLandingLocale();
  const pricingMeta = messages.pricingPage;

  const checkoutOk = searchParams.get("checkout") === "success";

  const heroSubtitle = useMemo(
    () =>
      "Choose a plan that fits how you learn. Upgrade anytime. B2B? Talk to us for Teacher / Enterprise.",
    [],
  );

  return (
    <div className="min-h-screen bg-background font-display text-foreground antialiased">
      <SEO
        title={pricingMeta.title}
        description={pricingMeta.description}
        canonicalUrl={resolveCanonicalUrl("/pricing")}
        ogLocale={locale === "uk" ? "uk_UA" : "en_US"}
        ogLocaleAlternate={locale === "uk" ? "en_US" : "uk_UA"}
      />
      <ContentHeader variant="landing" />
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-28 sm:px-6 lg:px-8 lg:pt-32">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{heroSubtitle}</p>
          {checkoutOk ?
            <p
              className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200"
              role="status"
            >
              Thanks — your checkout completed. It may take a moment for your
              subscription to show on your account.
            </p>
          : null}
          {!isLoggedIn ?
            <p className="mt-4 text-sm text-muted-foreground">
              <Link
                to="/loginForm"
                state={{ from: "/pricing" }}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Sign in
              </Link>{" "}
              to subscribe to Light, Smart, or Family.
            </p>
          : null}
        </div>

        <PricingCards
          onSelectConsumerPlan={(id) => void startCheckout(id, { isLoggedIn })}
          checkoutDisabled={checkoutLoading}
        />

        <p className="mx-auto mt-12 max-w-2xl text-center text-xs text-muted-foreground">
          Payments are processed securely by Stripe. By continuing you agree to
          our terms for your selected plan.
        </p>
      </main>
    </div>
  );
}
