import { apiFetch } from "./api";

/** From `vite` embed (optional shortcut; server can serve the same value via GET /billing/stripe-publishable-key). */
export function stripePublishableKeyFromEnv(): string | null {
  const k = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY?.trim();
  return k?.startsWith("pk_") ? k : null;
}

/**
 * Resolves Stripe publishable key: env first (build-time), else public API.
 * Does not send the learner JWT (public billing config).
 */
export async function resolveStripePublishableKey(): Promise<string | null> {
  const fromEnv = stripePublishableKeyFromEnv();
  if (fromEnv) return fromEnv;
  try {
    const res = await apiFetch("/billing/stripe-publishable-key", {
      method: "GET",
      token: null,
    });
    if (!res.ok) return null;
    const j = (await res.json()) as { publishableKey?: unknown };
    const pk =
      typeof j.publishableKey === "string" ? j.publishableKey.trim() : "";
    return pk.startsWith("pk_") ? pk : null;
  } catch {
    return null;
  }
}

export function stripeKeyMode(pk: string | null): "test" | "live" | null {
  if (!pk) return null;
  if (pk.startsWith("pk_test_")) return "test";
  if (pk.startsWith("pk_live_")) return "live";
  return null;
}
