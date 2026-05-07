import { Link } from "react-router";
import { ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden font-display py-24">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.65_0.25_295/0.2)_0%,transparent_70%)]" />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-center">
          <img src="/Icon.svg" className="w-38 h-46 animate-float" />
        </div>

        <h2 className="font-display mb-6 text-balance text-3xl font-bold sm:text-4xl lg:text-5xl">
          Ready to Start Your{" "}
          <span className="text-primary">English Journey</span>?
        </h2>

        <p className="mx-auto mb-8 max-w-2xltext-lg text-muted-foreground">
          Join thousands of learners who are already improving their English
          skills with personalized video content tailored just for them.
        </p>

        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link to="/registrationMain">
            <button className="flex rounded-[15px] bg-primary px-6 py-7 text-lg font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]">
              Get Started Free
              <ArrowRight className="h-7 w-7 p-0.5" />
            </button>
          </Link>
          <Link
            to="/level-test"
            className="text-lg font-medium text-foreground/70 hover:text-white py-7 px-6 transition-all rounded-[15px] hover:bg-muted-foreground/10 hover:cursor-pointer"
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
