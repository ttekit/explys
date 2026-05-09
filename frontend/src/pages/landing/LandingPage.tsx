import { useEffect } from "react";
import { useLocation } from "react-router";
import { HeroSection } from "../../components/landing/HeroSection";
import { ReleaseCountdownSection } from "../../components/landing/ReleaseCountdown";
import { FeaturesSection } from "../../components/landing/FeaturesSection";
import { HowItWorksSection } from "../../components/landing/HowItWorksSection";
import { CtaSection } from "../../components/landing/CtaSection";
import { LandingFooter } from "../../components/landing/LandingFooter";
import { LandingPricingSection } from "../../components/landing/LandingPricingSection";
import ContentHeader from "../../components/catalog/ContentHeader";
import { SEO } from "../../components/SEO/SEO";
import { resolveCanonicalUrl } from "../../lib/siteUrl";
import { buildLandingJsonLdSchemas } from "../../lib/seoStructuredData";
import { useLandingLocale } from "../../context/LandingLocaleContext";

/** React Router hash updates do not scroll like a full navigation — sync URL fragment to section ids. */
function useLandingHashScroll() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (pathname !== "/" || !hash) return;
    const id = decodeURIComponent(hash.replace(/^#/, ""));
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    const frame = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
}

export default function LandingPage() {
  const { messages, locale } = useLandingLocale();
  const { seo } = messages;
  useLandingHashScroll();

  return (
    <main
      className="min-h-screen"
      lang={locale === "uk" ? "uk" : "en"}
    >
      <SEO
        title={seo.title}
        description={seo.description}
        canonicalUrl={resolveCanonicalUrl("/")}
        useTitleSuffix={false}
        ogLocale={locale === "uk" ? "uk_UA" : "en_US"}
        ogLocaleAlternate={locale === "uk" ? "en_US" : "uk_UA"}
        jsonLd={buildLandingJsonLdSchemas()}
      />
      <ContentHeader variant="landing" />
      <HeroSection />
      <ReleaseCountdownSection />
      <FeaturesSection />
      <HowItWorksSection />
      <LandingPricingSection />
      <CtaSection />
      <LandingFooter />
    </main>
  );
}
