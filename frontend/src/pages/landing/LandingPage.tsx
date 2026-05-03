import { LandingHeader } from "../../components/landing/LandingHeader";
import { HeroSection } from "../../components/landing/HeroSection";
import { FeaturesSection } from "../../components/landing/FeaturesSection";
import { HowItWorksSection } from "../../components/landing/HowItWorksSection";
import { CtaSection } from "../../components/landing/CtaSection";
import { LandingFooter } from "../../components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <LandingHeader />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CtaSection />
      <LandingFooter />
    </main>
  );
}
