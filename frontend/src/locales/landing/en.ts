/** English copy for the marketing home page (/) and landing header variant. */
export const landingEn = {
  seo: {
    title: "Explys — Learn English with video lessons",
    description:
      "Learn English with interactive video lessons, subtitles, and AI-powered practice.",
  },

  catalogPage: {
    title: "Lesson catalog",
    description:
      "Choose videos by level and interests. Adaptive English learning on Explys.",
  },

  pricingPage: {
    title: "Pricing",
    description:
      "Simple plans from essentials to adaptive AI and family options — plus Teacher / Enterprise for schools.",
  },

  header: {
    navLinks: [
      { hash: "release-countdown", label: "Launch countdown" },
      { hash: "why-choose-explys", label: "Why Explys" },
      { hash: "how-explys-works", label: "How it works" },
      { hash: "ready-to-start", label: "Ready to start" },
    ],
    pricing: "Pricing",
    catalog: "Catalog",
    logIn: "Log in",
    getStarted: "Get started",
    openMenu: "Open menu",
    closeMenu: "Close menu",
  },

  hero: {
    badge: "Personalized learning",
    titleBefore: "Learn English",
    titleAccent: "your way",
    lead:
      "Adaptive video lessons that match your interests, level, and learning style — like a chameleon adapting to its environment, we adapt to you.",
    ctaPrimary: "Start learning free",
    ctaSecondary: "Browse content",
    statLearners: "Active learners",
    statLessons: "Video lessons",
    statRating: "User rating",
  },

  features: {
    titleBefore: "Why choose",
    titleBrand: "Explys",
    titleAfter: "?",
    subtitle:
      "Our adaptive platform combines the best of entertainment and education.",
    items: [
      {
        title: "Video-based learning",
        description:
          "Learn from real-world content — movies, series, and educational videos tailored to your interests.",
      },
      {
        title: "AI personalization",
        description:
          "Our system adapts to your pace, preferences, and the skills you need most.",
      },
      {
        title: "Focused practice",
        description:
          "Interactive quizzes after each video reinforce vocabulary, grammar, and listening skills.",
      },
      {
        title: "For everyone",
        description:
          "Students, professionals, and teachers — there’s a learning path for you.",
      },
      {
        title: "Gamified progress",
        description:
          "Earn XP, unlock achievements, and track your journey from beginner to confident speaker.",
      },
      {
        title: "Detailed analytics",
        description:
          "Visual reports highlight strengths and growth areas with clear, actionable insights.",
      },
    ],
  },

  howItWorks: {
    titleBefore: "How",
    titleBrand: "Explys",
    subtitle:
      "Get started in minutes and begin your personalized learning journey.",
    stepPrefix: "Step",
    steps: [
      {
        number: "01",
        title: "Create your profile",
        description:
          "Tell us about your work, hobbies, favourite genres, and learning goals.",
      },
      {
        number: "02",
        title: "Take the level test",
        description:
          "A quick check to gauge your current English level.",
      },
      {
        number: "03",
        title: "Watch & learn",
        description:
          "Enjoy personalized video content matched to your interests and level.",
      },
      {
        number: "04",
        title: "Practice & progress",
        description:
          "Complete interactive quizzes and watch your skills grow over time.",
      },
    ],
  },

  pricingSection: {
    title: "Simple, transparent pricing",
    subtitle:
      "From essentials to adaptive AI and family plans — plus solutions for schools.",
    fullPageLink: "Full pricing page",
  },

  releaseCountdown: {
    titleAccent: "Launch",
    titleRest: " countdown",
    subtitleBefore: "Explys goes live on",
    subtitleDate: "22 May 2026",
    subtitleAfter:
      ". Track every hour until release — days, hours, minutes, and seconds below.",
    statusLive: "We’re live",
    statusWaiting: "Time until launch",
    hoursRemaining: "total hours remaining",
    thanksLive: "Thanks for waiting — welcome to Explys",
    units: {
      days: "Days",
      hours: "Hours",
      minutes: "Minutes",
      seconds: "Seconds",
    },
  },

  cta: {
    titleBefore: "Ready to start your",
    titleAccent: "English journey",
    titleAfter: "?",
    subtitle:
      "Join thousands of learners improving their English with personalized video content.",
    catalog: "Catalog",
    getStartedFree: "Get started free",
    howItWorks: "How it works",
    footnote: "No credit card required. Start learning in under 2 minutes.",
  },

  pricingCards: {
    popularBadge: "Most popular",
    teacherPriceTitle: "Custom / Enterprise",
    plans: {
      light: {
        name: "Light (Essentials)",
        description: "For self-paced basic learning.",
        billingNote: "per month",
        features: [
          "Full access to the video library",
          "Basic quests and gamification",
          "Saving words to a personal dictionary",
        ],
        ctaLabel: "Select Light",
      },
      smart: {
        name: "Smart (Adaptive)",
        description: "A dynamic AI program that saves you time.",
        billingNote: "per month",
        features: [
          "AI error analysis and program adjustments",
          "Unlimited interactive exercises",
          "Deep progress analytics",
          "Leaderboards and a personalized growth plan",
        ],
        ctaLabel: "Start with Smart",
      },
      family: {
        name: "Family (LMS/Pro)",
        description: "All the benefits of Smart for the whole family.",
        billingNote: "per month",
        features: [
          "Up to 3 profiles per subscription",
          "Shared parental controls",
          "Family tournaments",
          "All Smart plan functionality",
        ],
        ctaLabel: "Sign up for Family",
      },
      teacher: {
        name: "Teacher (LMS Office)",
        description:
          "A tool for private teachers and schools (up to 40 students per class).",
        billingNote: "Enterprise",
        features: [
          "Teacher dashboard and gradebook",
          "Automated quiz checking",
          "Analytics (highlighting student problem areas)",
          "Assigning video assignments (Flipped classroom)",
        ],
        ctaLabel: "Contact us",
      },
    },
  },

  footer: {
    categories: {
      product: "Product",
      account: "Account",
    },
    tagline:
      "Personalized English learning through adaptive video content. Learn at your own pace, in your own way.",
    copyright: "All rights reserved.",
    links: {
      launchCountdown: "Launch countdown",
      whyChoose: "Why Explys",
      howWorks: "How Explys works",
      pricing: "Pricing",
      readyToStart: "Ready to start",
      logIn: "Log in",
      register: "Register",
    },
  },
} as const;
