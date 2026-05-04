import posthog from "posthog-js";

let initialized = false;

export function initPosthog(): void {
  if (initialized) {
    return;
  }
  const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
  const host =
    import.meta.env.VITE_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  if (typeof key !== "string" || !key.trim()) {
    return;
  }

  posthog.init(key.trim(), {
    api_host: host,
    persistence: "localStorage+cookie",
    capture_pageview: false,
    capture_pageleave: true,
    person_profiles: "identified_only",
  });
  initialized = true;
}

export function capturePageView(pathname: string): void {
  const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
  if (typeof key !== "string" || !key.trim()) {
    return;
  }
  initPosthog();
  posthog.capture("$pageview", { path: pathname });
}

export function captureEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
  if (typeof key !== "string" || !key.trim()) {
    return;
  }
  initPosthog();
  posthog.capture(event, properties);
}

export function identifyLearner(
  distinctId: string,
  traits?: Record<string, unknown>,
): void {
  const key = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
  if (typeof key !== "string" || !key.trim()) {
    return;
  }
  initPosthog();
  posthog.identify(distinctId, traits);
}

export function resetAnalytics(): void {
  if (!initialized) return;
  posthog.reset();
}
