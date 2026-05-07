import { useMemo } from "react";
import { Check } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  type PricingPlan,
  type PricingPlanId,
  PRICING_PLANS,
} from "../../lib/pricingPlans";
import type { LandingMessages } from "../../locales/landing";
import { getSalesContactHref } from "../../lib/salesContact";
import { useLandingLocale } from "../../context/LandingLocaleContext";

export type PricingCardsProps = {
  onSelectConsumerPlan?: (
    planId: Extract<PricingPlanId, "light" | "smart" | "family">,
  ) => void;
  checkoutDisabled?: boolean;
  className?: string;
};

function overlayPlan(
  base: PricingPlan,
  pc: LandingMessages["pricingCards"],
): PricingPlan {
  const o = pc.plans[base.id];
  return {
    ...base,
    name: o.name,
    description: o.description,
    billingNote: o.billingNote,
    features: o.features.map((text) => ({ text })),
    ctaLabel: o.ctaLabel,
  };
}

function CtaButton({
  plan,
  onSelectConsumerPlan,
  checkoutDisabled,
}: {
  plan: PricingPlan;
  onSelectConsumerPlan?: PricingCardsProps["onSelectConsumerPlan"];
  checkoutDisabled?: boolean;
}) {
  const base =
    "mt-auto w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

  if (plan.isContactSales) {
    return (
      <a
        href={getSalesContactHref()}
        className={cn(
          base,
          "inline-flex items-center justify-center border-2 border-border bg-transparent text-foreground hover:bg-muted/60",
        )}
      >
        {plan.ctaLabel}
      </a>
    );
  }

  const isPrimary = plan.ctaVariant === "primary";
  const isSecondary = plan.ctaVariant === "secondary";

  return (
    <button
      type="button"
      disabled={checkoutDisabled}
      onClick={() =>
        onSelectConsumerPlan?.(plan.id as "light" | "smart" | "family")
      }
      className={cn(
        base,
        isPrimary &&
          "border-2 border-primary bg-primary text-primary-foreground shadow-[inset_0_2px_8px_rgba(0,0,0,0.25)] hover:bg-primary/90",
        isSecondary &&
          "border border-border bg-muted/50 text-foreground hover:bg-muted",
      )}
    >
      {plan.ctaLabel}
    </button>
  );
}

function PricingCard({
  plan,
  popularBadge,
  teacherPriceTitle,
  onSelectConsumerPlan,
  checkoutDisabled,
}: {
  plan: PricingPlan;
  popularBadge: string;
  teacherPriceTitle: string;
  onSelectConsumerPlan?: PricingCardsProps["onSelectConsumerPlan"];
  checkoutDisabled?: boolean;
}) {
  const popular = plan.isPopular === true;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-2xl border bg-card p-6 shadow-sm",
        popular
          ? "z-10 border-primary/60 bg-linear-to-b from-primary/10 via-card to-card shadow-[0_0_0_1px_oklch(0.65_0.25_295/0.35)] lg:scale-[1.02]"
          : "border-border",
      )}
    >
      {popular ?
        <span className="absolute -top-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground shadow-md">
          {popularBadge}
        </span>
      : null}

      <div className={cn("mb-4 pt-1", popular && "pt-2")}>
        <h3 className="font-display text-lg font-semibold text-foreground">
          {plan.name}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {plan.description}
        </p>
      </div>

      <div className="mb-6 border-border border-b pb-6">
        {plan.isContactSales ?
          <div>
            <p className="font-display text-3xl font-bold tracking-tight text-foreground">
              {teacherPriceTitle}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {plan.billingNote}
            </p>
          </div>
        : <>
            <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0">
              <span className="font-display text-4xl font-bold tracking-tight text-foreground">
                {plan.priceLabel}
              </span>
              <span className="text-sm font-medium text-muted-foreground">
                {" "}
                {plan.billingNote}
              </span>
            </div>
          </>
        }
      </div>

      <ul className="mb-6 flex flex-1 flex-col gap-3">
        {plan.features.map((f, idx) => (
          <li
            key={`${plan.id}-${idx}`}
            className="flex gap-3 text-sm text-foreground/90"
          >
            <Check
              className="mt-0.5 size-4 shrink-0 text-emerald-500"
              strokeWidth={2.5}
              aria-hidden
            />
            <span>{f.text}</span>
          </li>
        ))}
      </ul>

      <CtaButton
        plan={plan}
        onSelectConsumerPlan={onSelectConsumerPlan}
        checkoutDisabled={checkoutDisabled}
      />
    </div>
  );
}

export default function PricingCards({
  onSelectConsumerPlan,
  checkoutDisabled = false,
  className,
}: PricingCardsProps) {
  const { messages } = useLandingLocale();
  const pc = messages.pricingCards;

  const plans = useMemo(
    () => PRICING_PLANS.map((p) => overlayPlan(p, pc)),
    [pc],
  );

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4 xl:items-stretch xl:gap-5",
        className,
      )}
    >
      {plans.map((plan) => (
        <PricingCard
          key={plan.id}
          plan={plan}
          popularBadge={pc.popularBadge}
          teacherPriceTitle={pc.teacherPriceTitle}
          onSelectConsumerPlan={onSelectConsumerPlan}
          checkoutDisabled={checkoutDisabled}
        />
      ))}
    </div>
  );
}
