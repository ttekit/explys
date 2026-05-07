import { BarChart3, Brain, Target, Trophy, Users, Video } from "lucide-react";

const features = [
  {
    icon: Video,
    title: "Video-Based Learning",
    description:
      "Learn from real-world content including movies, series, and educational videos tailored to your interests.",
  },
  {
    icon: Brain,
    title: "AI Personalization",
    description:
      "Our intelligent system adapts to your learning pace, preferences, and areas that need improvement.",
  },
  {
    icon: Target,
    title: "Focused Practice",
    description:
      "Interactive quizzes after each video reinforce vocabulary, grammar, and comprehension skills.",
  },
  {
    icon: Users,
    title: "For Everyone",
    description:
      "Whether you are a student, professional, or teacher, we have tailored learning paths for you.",
  },
  {
    icon: Trophy,
    title: "Gamified Progress",
    description:
      "Earn XP, unlock achievements, and track your journey from beginner to fluent speaker.",
  },
  {
    icon: BarChart3,
    title: "Detailed Analytics",
    description:
      "Visual progress reports show your strengths and areas for growth with actionable insights.",
  },
];

export function FeaturesSection() {
  return (
    <section
      id="why-choose-explys"
      className="relative font-display scroll-mt-24 py-24"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,oklch(0.75_0.18_145/0.08)_0%,transparent_50%)]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="font-display mb-4 text-balance text-3xl font-bold sm:text-4xl">
            Why Choose <span className="text-primary">Explys</span>?
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Our adaptive learning platform combines the best of entertainment
            and education
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
