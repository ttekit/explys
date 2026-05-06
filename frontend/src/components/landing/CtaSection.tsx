import { Link } from "react-router";
import { ChameleonMascot } from "../ChameleonMascot";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section
      id="start-journey"
      className="relative scroll-mt-24 overflow-hidden py-24"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_oklch(0.65_0.25_295_/_0.2)_0%,_transparent_70%)]" />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-center">
          <ChameleonMascot size="lg" mood="waving" />
        </div>

        <h2 className="font-display mb-6 text-balance text-3xl font-bold sm:text-4xl lg:text-5xl">
          Ready to Start Your{" "}
          <span className="text-primary">English Journey</span>?
        </h2>

        <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
          Join thousands of learners who are already improving their English
          skills with personalized video content tailored just for them.
        </p>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            to="/registrationMain"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-6 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get Started Free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            to="/level-test"
            className="inline-flex items-center justify-center rounded-xl border border-border px-8 py-6 text-lg font-semibold transition-colors hover:bg-muted"
          >
            Take Level Test
          </Link>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          No credit card required. Start learning in under 2 minutes.
        </p>
      </div>
    </section>
  );
}
