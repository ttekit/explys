import { HeroSection } from "../../components/landing/HeroSection";
import { FeaturesSection } from "../../components/landing/FeaturesSection";
import { HowItWorksSection } from "../../components/landing/HowItWorksSection";
import { CtaSection } from "../../components/landing/CtaSection";
import { LandingFooter } from "../../components/landing/LandingFooter";
import ContentHeader from "../../components/catalog/ContentHeader";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <ContentHeader />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CtaSection />
      <LandingFooter />
    </main>
  );
}
