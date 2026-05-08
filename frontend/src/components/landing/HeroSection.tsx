import { Link } from "react-router";
import { Play, Sparkles } from "lucide-react";
import { useLandingLocale } from "../../context/LandingLocaleContext";

export function HeroSection() {
  const { messages } = useLandingLocale();
  const { hero } = messages;

  return (
    <section className="relative border-b font-display border-border flex min-h-screen items-center overflow-hidden pt-24 pb-16">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.65_0.25_295/0.15)_0%,transparent_50%)]" />
      <div className="absolute top-1/4 right-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-1/4 left-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                {hero.badge}
              </span>
            </div>

            <h1 className="font-display text-4xl leading-tight font-bold text-balance sm:text-5xl lg:text-6xl">
              {hero.titleBefore}{" "}
              <span className="text-primary">{hero.titleAccent}</span>
            </h1>

            <p className="max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {hero.lead}
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                to="/registrationMain"
                className="rounded-[15px] bg-primary px-6 py-5.5 text-lg items-center justify-center font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]"
              >
                {hero.ctaPrimary}
              </Link>
              <Link
                to="/catalog"
                className="inline-flex text-foreground/70 hover:text-white rounded-[15px] px-3 items-center justify-center gap-2 rounded-xlpx-8 py-6 text-lg font-semibold transition-colors hover:bg-muted-foreground/10"
              >
                <Play className="h-5 w-5" />
                {hero.ctaSecondary}
              </Link>
            </div>

            <div className="flex items-center gap-8 pt-4">
              <div>
                <p className="text-2xl font-bold text-foreground">50K+</p>
                <p className="text-sm text-muted-foreground">
                  {hero.statLearners}
                </p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div>
                <p className="text-2xl font-bold text-foreground">1000+</p>
                <p className="text-sm text-muted-foreground">
                  {hero.statLessons}
                </p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div>
                <p className="text-2xl font-bold text-foreground">4.9</p>
                <p className="text-sm text-muted-foreground">
                  {hero.statRating}
                </p>
              </div>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="relative">
              <div className="absolute inset-0 scale-100 rounded-full bg-primary/20 blur-3xl" />
              <img src="/Icon.svg" className="w-54 h-62 animate-float" alt="" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
