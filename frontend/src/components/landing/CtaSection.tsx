import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useUser } from "../../context/UserContext";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import {
  trackLandingCtaPrimary,
  trackLandingCtaSecondary,
} from "../../lib/landingAnalytics";

export function CtaSection() {
  const { isLoggedIn } = useUser();
  const { messages } = useLandingLocale();
  const { cta } = messages;
  const primaryTo = isLoggedIn ? "/catalog" : "/register";
  const primaryLabel = isLoggedIn ? cta.catalog : cta.startFree;

  return (
    <section
      id="ready-to-start"
      className="relative scroll-mt-24 overflow-hidden py-16 font-display sm:py-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.65_0.25_295/0.15)_0%,transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 top-0 size-72 animate-aurora rounded-full bg-primary/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 bottom-0 size-72 animate-aurora rounded-full bg-[color-mix(in_oklch,var(--nebula)_30%,transparent)] blur-[120px] [animation-delay:-6s]"
      />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mb-6 flex justify-center sm:mb-8">
          <img
            src={`${import.meta.env.BASE_URL}Greeting.svg`}
            className="h-32 w-28 animate-float sm:h-46 sm:w-38"
            alt=""
          />
        </div>

        <h2 className="mb-4 text-balance text-2xl font-bold sm:mb-6 sm:text-4xl lg:text-5xl">
          {cta.titleBefore}{" "}
          <span className="text-primary">{cta.titleAccent}</span>
          {cta.titleAfter}
        </h2>

        <p className="mx-auto mb-6 max-w-2xl font-sans text-base text-muted-foreground sm:mb-8 sm:text-lg">
          {cta.subtitle}
        </p>

        <div className="flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center sm:justify-center">
          <Link to={primaryTo} onClick={() => trackLandingCtaPrimary("bottom")}>
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4 text-lg font-semibold text-primary-foreground shadow-[0_0_30px_-8px_var(--glow)] transition-all hover:scale-[1.02] hover:bg-primary/90 sm:w-auto"
            >
              {primaryLabel}
              <ArrowRight className="h-6 w-6 shrink-0" />
            </button>
          </Link>
          <Link
            to="/demo-lesson"
            onClick={() => trackLandingCtaSecondary("bottom")}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 px-6 py-4 text-lg font-semibold text-foreground backdrop-blur-sm transition-colors hover:bg-secondary/70 sm:w-auto"
          >
            {cta.howItWorks}
            <ArrowRight className="h-5 w-5 shrink-0" />
          </Link>
        </div>

        <p className="mt-6 font-sans text-sm text-muted-foreground">
          {cta.trustNoCard}
          <span aria-hidden="true"> · </span>
          {cta.trustPrivacy}
        </p>
        <p className="mt-2 font-sans text-sm text-muted-foreground/80">
          {cta.footnotePromo}
        </p>
      </div>
    </section>
  );
}
