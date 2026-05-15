import type { UserData } from "../context/UserContext";

function readSubscriptionDevModeRaw(): string {
  return (import.meta.env.VITE_APP_SUBSCRIPTION_DEV_MODE ?? "0")
    .trim()
    .toLowerCase();
}

/**
 * `DEV_MODE=1` (or `true` / `yes`): subscription gates behave like local dev (relaxed).
 * `DEV_MODE=0`: product-like enforcement from the SPA’s perspective.
 * Set in `.env` as `DEV_MODE` or `VITE_DEV_MODE` (see `vite.config.ts`).
 */
export function subscriptionDevModeEnabled(): boolean {
  const raw = readSubscriptionDevModeRaw();
  return raw === "1" || raw === "true" || raw === "yes";
}

/**
 * When true, learner routes do not require an active Stripe subscription.
 * Driven by `DEV_MODE` / `VITE_DEV_MODE` (defaults: `1` under `vite dev`, `0` for production builds).
 * When `DEV_MODE=0`, optional `VITE_SKIP_SUBSCRIPTION_ENFORCEMENT` can still bypass (staging).
 */
export function subscriptionEnforcementDisabled(): boolean {
  if (subscriptionDevModeEnabled()) {
    return true;
  }
  const v = (import.meta.env.VITE_SKIP_SUBSCRIPTION_ENFORCEMENT ?? "")
    .trim()
    .toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function userHasPaidSubscription(user: UserData | null): boolean {
  if (!user) return false;
  const s = (user.subscriptionStatus ?? "").trim().toLowerCase();
  return s === "active" || s === "trialing";
}

/** Teachers and roster-linked students bypass the consumer paywall. */
export function userExemptFromSubscription(user: UserData | null): boolean {
  if (!user) return false;
  if (user.role === "teacher") return true;
  if (user.teacherId != null) return true;
  return false;
}

export function userMayUseLearnerApp(user: UserData | null): boolean {
  if (subscriptionEnforcementDisabled()) return true;
  if (!user) return false;
  if (userExemptFromSubscription(user)) return true;
  return userHasPaidSubscription(user);
}
