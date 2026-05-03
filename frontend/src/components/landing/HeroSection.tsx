import { Link } from "react-router";
import { ChameleonMascot } from "../ChameleonMascot";
import { Play, Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden pt-24 pb-16">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_oklch(0.65_0.25_295_/_0.15)_0%,_transparent_50%)]" />
      <div className="absolute top-1/4 right-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-1/4 left-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Personalized Learning
              </span>
            </div>

            <h1 className="font-display text-4xl leading-tight font-bold text-balance sm:text-5xl lg:text-6xl">
              Learn English{" "}
              <span className="text-primary">Your Way</span>
            </h1>

            <p className="max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Adaptive video lessons that match your interests, level, and
              learning style. Just like a chameleon adapts to its environment, we
              adapt to you.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                to="/registrationMain"
                className="animate-glow inline-flex items-center justify-center rounded-xl bg-primary px-8 py-6 text-lg font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Start Learning Free
              </Link>
              <Link
                to="/catalog"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-8 py-6 text-lg font-semibold transition-colors hover:bg-muted"
              >
                <Play className="h-5 w-5" />
                Browse Content
              </Link>
            </div>

            <div className="flex items-center gap-8 pt-4">
              <div>
                <p className="text-2xl font-bold text-foreground">50K+</p>
                <p className="text-sm text-muted-foreground">Active Learners</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div>
                <p className="text-2xl font-bold text-foreground">1000+</p>
                <p className="text-sm text-muted-foreground">Video Lessons</p>
              </div>
              <div className="h-10 w-px bg-border" />
              <div>
                <p className="text-2xl font-bold text-foreground">4.9</p>
                <p className="text-sm text-muted-foreground">User Rating</p>
              </div>
            </div>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <div className="relative">
              <div
                className="animate-float absolute -top-8 -left-8"
                style={{ animationDelay: "0s" }}
              >
                <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
                  <p className="text-sm font-medium text-foreground">Hello! 👋</p>
                </div>
              </div>
              <div
                className="animate-float absolute top-1/4 -right-12"
                style={{ animationDelay: "2s" }}
              >
                <div className="rounded-xl border border-primary/30 bg-primary/20 p-3 shadow-lg">
                  <p className="text-sm font-medium text-primary">Level Up!</p>
                </div>
              </div>
              <div
                className="animate-float absolute -left-16 bottom-8"
                style={{ animationDelay: "4s" }}
              >
                <div className="rounded-xl border border-accent/30 bg-accent/20 p-3 shadow-lg">
                  <p className="text-sm font-medium text-accent">+500 XP</p>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 scale-75 rounded-full bg-primary/20 blur-3xl" />
                <ChameleonMascot
                  size="xl"
                  mood="excited"
                  className="relative z-10 scale-150"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
