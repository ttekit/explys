import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useUser } from "../../context/UserContext";

export function CtaSection() {
  const { isLoggedIn } = useUser();
  const primaryTo = isLoggedIn ? "/catalog" : "/registrationMain";
  const primaryLabel = isLoggedIn ? "Catalog" : "Get Started Free";
  return (
    <section
      id="ready-to-start"
      className="relative scroll-mt-24 overflow-hidden py-24 font-display"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.65_0.25_295/0.2)_0%,transparent_70%)]" />

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-center">
          <img src="/Icon.svg" className="w-38 h-46 animate-float" />
        </div>

        <h2 className="font-display mb-6 text-balance text-3xl font-bold sm:text-4xl lg:text-5xl">
          Ready to Start Your{" "}
          <span className="text-primary">English Journey</span>?
        </h2>

        <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
          Join thousands of learners who are already improving their English
          skills with personalized video content tailored just for them.
        </p>

        <div className="flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center sm:justify-center">
          <Link to={primaryTo}>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-[15px] bg-primary px-6 py-7 text-lg font-semibold text-foreground/70 shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)] transition-all hover:cursor-pointer hover:bg-purple-hover hover:text-white sm:w-auto"
            >
              {primaryLabel}
              <ArrowRight className="h-7 w-7 shrink-0 p-0.5" />
            </button>
          </Link>
          <Link
            to={{ pathname: "/", hash: "#how-explys-works" }}
            className="flex w-full items-center justify-center rounded-[15px] border border-white/20 px-6 py-7 text-lg font-semibold text-foreground/85 backdrop-blur-sm transition-all hover:border-white/35 hover:bg-white/5 hover:text-white sm:w-auto"
          >
            See how it works
          </Link>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          No credit card required. Start learning in under 2 minutes.
        </p>
      </div>
    </section>
  );
}
