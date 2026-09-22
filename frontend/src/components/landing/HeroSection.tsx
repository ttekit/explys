import { useRef, useState } from "react";
import { Link } from "react-router";
import { Play, Sparkles, Clock, SaveAll } from "lucide-react";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { useUser } from "../../context/UserContext";
import {
  trackLandingCtaPrimary,
  trackLandingCtaSecondary,
} from "../../lib/landingAnalytics";
import { ShootingStars } from "./effects/ShootingStars";
import HeroStats from "./HeroStats";

export function HeroSection() {
  const { messages } = useLandingLocale();
  const { hero, cta } = messages;
  const { user } = useUser();
  const heroRef = useRef<HTMLElement | null>(null);
  const [pointer, setPointer] = useState({ x: 50, y: 30 });

  const primaryTo = user ? "/catalog" : "/register";

  function handle_pointer_move(event: React.MouseEvent) {
    const element = heroRef.current;
    if (!element) {
      return;
    }
    const rect = element.getBoundingClientRect();
    setPointer({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <section
      ref={heroRef}
      onMouseMove={handle_pointer_move}
      className="relative flex min-h-[calc(100dvh-4.5rem)] items-center overflow-hidden border-b border-border/60 pt-20 pb-10 font-display sm:min-h-screen sm:pt-24 sm:pb-16"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-[background] duration-300"
        style={{
          background: `radial-gradient(600px circle at ${pointer.x}% ${pointer.y}%, color-mix(in oklch, var(--glow) 18%, transparent), transparent 65%)`,
        }}
      />
      <ShootingStars />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-1/4 size-72 animate-aurora rounded-full bg-primary/20 blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-5 sm:space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 backdrop-blur-sm sm:px-4 sm:py-2">
              <Sparkles className="h-4 w-4 animate-pulse-glow text-glow" />
              <span className="text-xs font-medium text-primary sm:text-sm">
                {hero.badge}
              </span>
            </div>

            <h1 className="text-3xl leading-tight font-bold text-balance sm:text-5xl lg:text-6xl">
              {hero.titleBefore}{" "}
              <span className="animate-gradient-text bg-gradient-to-r from-glow via-primary to-nebula bg-clip-text text-transparent">
                {hero.titleAccent}
              </span>
            </h1>

            <p className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-xl">
              {hero.lead}
            </p>

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary/70 sm:text-sm">
                  <Clock className="h-4 w-4 shrink-0" />
                  {hero.account}
                </div>
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary/70 sm:text-sm">
                  <SaveAll className="h-4 w-4 shrink-0" />
                  {hero.progressSave}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
                <Link
                  to={primaryTo}
                  onClick={() => trackLandingCtaPrimary("hero")}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-center text-base font-semibold text-primary-foreground shadow-[0_0_30px_-8px_var(--glow)] transition-all hover:scale-[1.02] hover:bg-primary/90 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
                >
                  {cta.startFree}
                </Link>

                <Link
                  to="/catalog"
                  onClick={() => trackLandingCtaSecondary("hero")}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-secondary/40 px-6 py-3.5 text-center text-base font-semibold text-foreground backdrop-blur-sm transition-colors hover:bg-secondary/70 sm:w-auto sm:px-8 sm:py-4 sm:text-lg"
                >
                  <Play className="h-5 w-5 shrink-0" />
                  {hero.ctaSecondary}
                </Link>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  {hero.trustNoCard}
                  <span aria-hidden="true"> · </span>
                  {hero.trustPrivacy}
                </p>
                <p className="text-xs font-medium text-primary/80 sm:text-sm">
                  {cta.footnotePromo}
                </p>
              </div>
            </div>

            <HeroStats />
          </div>

          <div className="relative hidden justify-center lg:flex lg:justify-end">
            <img
              src={`${import.meta.env.BASE_URL}LandingPicture.png`}
              className="w-full max-w-md animate-float xl:max-w-lg"
              alt=""
            />
          </div>
        </div>

        <div className="relative mx-auto mt-6 flex max-w-[280px] justify-center sm:max-w-xs lg:hidden">
          <img
            src={`${import.meta.env.BASE_URL}LandingPicture.png`}
            className="w-full animate-float"
            alt=""
          />
        </div>
      </div>
    </section>
  );
}
