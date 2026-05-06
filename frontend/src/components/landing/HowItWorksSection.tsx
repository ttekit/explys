import { ChameleonMascot } from "../ChameleonMascot";

const steps = [
  {
    number: "01",
    title: "Create Your Profile",
    description:
      "Tell us about yourself — your job, hobbies, favorite genres, and learning goals.",
    mascotMood: "happy" as const,
  },
  {
    number: "02",
    title: "Take the Level Test",
    description:
      "A quick assessment to determine your current English proficiency level.",
    mascotMood: "thinking" as const,
  },
  {
    number: "03",
    title: "Watch & Learn",
    description:
      "Enjoy personalized video content that matches your interests and level.",
    mascotMood: "excited" as const,
  },
  {
    number: "04",
    title: "Practice & Progress",
    description:
      "Complete interactive quizzes and watch your skills grow over time.",
    mascotMood: "waving" as const,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-exply-works" className="scroll-mt-24 bg-card/50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="font-display mb-4 text-balance text-3xl font-bold sm:text-4xl">
            How <span className="text-primary">Exply</span> Works
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Get started in minutes and begin your personalized learning journey
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
                  <ChameleonMascot
                    size="sm"
                    mood={step.mascotMood}
                    animate={false}
                  />
                </div>

                <span className="mb-2 text-sm font-bold text-primary">
                  Step {step.number}
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
