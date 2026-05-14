import type { UserData } from "../context/UserContext";

/**
 * When true, learner routes do not require an active Stripe subscription.
 * `vite dev` enables this automatically so local work does not wait on webhooks
 * or show post-checkout “confirming payment” UI; production builds never set `DEV`.
 * For staging/prod frontends, set `VITE_SKIP_SUBSCRIPTION_ENFORCEMENT` to match
 * backend `SKIP_SUBSCRIPTION_ENFORCEMENT`.
 */
export function subscriptionEnforcementDisabled(): boolean {
  if (import.meta.env.DEV) {
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
