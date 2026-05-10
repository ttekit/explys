export interface PricingFeature {
  text: string;
}

export type PricingPlanId = "light" | "smart" | "family" | "teacher";

export type PricingCtaVariant = "primary" | "secondary" | "outline";

export interface PricingPlan {
  id: PricingPlanId;
  name: string;
  description: string;
  priceLabel: string;
  /** e.g. "/ month" line under price for consumer tiers */
  billingNote?: string;
  features: PricingFeature[];
  ctaLabel: string;
  ctaVariant: PricingCtaVariant;
  isPopular?: boolean;
  /** B2B: no Stripe checkout; Contact Sales only */
  isContactSales?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "light",
    name: "Light (Essentials)",
    description: "For self-paced basic learning.",
    priceLabel: "$7",
    billingNote: "per month",
    features: [
      { text: "Full access to the video library" },
      { text: "Basic quests and gamification" },
      { text: "Saving words to a personal dictionary" },
    ],
    ctaLabel: "Select Light",
    ctaVariant: "secondary",
  },
  {
    id: "smart",
    name: "Smart (Adaptive)",
    description: "A dynamic AI program that saves you time.",
    priceLabel: "$12",
    billingNote: "per month",
    features: [
      { text: "AI error analysis and program adjustments" },
      { text: "Unlimited interactive exercises" },
      { text: "Deep progress analytics" },
      { text: "Leaderboards and a personalized growth plan" },
    ],
    ctaLabel: "Start with Smart",
    ctaVariant: "primary",
    isPopular: true,
  },
  {
    id: "family",
    name: "Family (LMS/Pro)",
    description: "All the benefits of Smart for the whole family.",
    priceLabel: "$19",
    billingNote: "per month",
    features: [
      { text: "Up to 3 profiles per subscription" },
      { text: "Shared parental controls" },
      { text: "Family tournaments" },
      { text: "All Smart plan functionality" },
    ],
    ctaLabel: "Sign up for Family",
    ctaVariant: "secondary",
  },
  {
    id: "teacher",
    name: "Teacher (LMS Office)",
    description:
      "A tool for private teachers and schools (up to 40 students per class).",
    priceLabel: "Custom",
    billingNote: "Enterprise",
    features: [
      { text: "Teacher dashboard and gradebook" },
      { text: "Automated quiz checking" },
      { text: "Analytics (highlighting student problem areas)" },
      { text: "Assigning video assignments (Flipped classroom)" },
    ],
    ctaLabel: "Contact us",
    ctaVariant: "outline",
    isContactSales: true,
  },
];
