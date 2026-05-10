import {
  CircleUser,
  BookOpenCheck,
  MonitorPlay,
  TrendingUp,
} from "lucide-react";
import { useLandingLocale } from "../../context/LandingLocaleContext";

const stepIcons = [
  <CircleUser key="0" className="h-10 w-10 text-muted-foreground" />,
  <BookOpenCheck key="1" className="h-10 w-10 text-muted-foreground" />,
  <MonitorPlay key="2" className="h-10 w-10 text-muted-foreground" />,
  <TrendingUp key="3" className="h-10 w-10 text-muted-foreground" />,
];

export function HowItWorksSection() {
  const { messages } = useLandingLocale();
  const { howItWorks } = messages;
  const { steps } = howItWorks;

  return (
    <section
      id="how-explys-works"
      className="bg-card/50 scroll-mt-24 border-b border-t border-border py-24 font-display"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="font-display mb-4 text-balance text-3xl font-bold sm:text-4xl">
            {howItWorks.titleBefore}{" "}
            <span className="text-primary">{howItWorks.titleBrand}</span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {howItWorks.subtitle}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <div key={step.number} className="group relative">
              {index < steps.length - 1 && (
                <div className="absolute top-12 left-1/2 hidden h-px w-full bg-border transition-colors group-hover:bg-primary/50 lg:block" />
              )}

              <div className="relative flex flex-col items-center text-center">
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-border bg-muted transition-colors group-hover:border-primary">
                  {stepIcons[index]}
                </div>

                <span className="mb-2 text-sm font-bold text-primary">
                  {howItWorks.stepPrefix} {step.number}
                </span>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
