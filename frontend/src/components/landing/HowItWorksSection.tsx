import { useLandingLocale } from "../../context/LandingLocaleContext";

const stepIcons = [
  <img src={`${import.meta.env.BASE_URL}LandingProfile.svg`} key="0" className="h-20 w-20" />,
  <img src={`${import.meta.env.BASE_URL}LandingTest.svg`} key="1" className="h-20 w-20" />,
  <img src={`${import.meta.env.BASE_URL}LandingPlan.svg`} key="2" className="h-20 w-20" />,
  <img src={`${import.meta.env.BASE_URL}LandingResult.svg`} key="3" className="h-20 w-20" />,
];

export function HowItWorksSection() {
  const { messages } = useLandingLocale();
  const { howItWorks } = messages;
  const { steps } = howItWorks;

  return (
    <section
      id="how-explys-works"
      className="relative scroll-mt-24 border-b border-t border-border/60 bg-card/30 py-16 font-display backdrop-blur-[2px] sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="font-display mb-4 text-balance text-3xl font-bold sm:text-4xl">
            {howItWorks.titleBefore}{" "}
            <span className="text-primary">{howItWorks.titleBrand}</span>{" "}
            {howItWorks.titleAfter}
          </h2>
          <p className="mx-auto max-w-2xl font-sans text-lg text-muted-foreground">
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
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border-2 border-border bg-muted/80 backdrop-blur-sm transition-all duration-300 group-hover:border-primary group-hover:shadow-[0_0_24px_-8px_var(--glow)]">
                  {stepIcons[index]}
                </div>

                <span className="mb-2 text-sm font-bold text-primary">
                  {howItWorks.stepPrefix} {step.number}
                </span>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="font-sans text-sm text-muted-foreground">
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
