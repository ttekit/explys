/** Stripe subscription statuses that grant product access */
const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
]);

export function hasPaidSubscriptionAccess(
  subscriptionStatus: string | null | undefined,
): boolean {
  const s = (subscriptionStatus ?? "").trim().toLowerCase();
  return ACTIVE_SUBSCRIPTION_STATUSES.has(s);
}

/**
 * Subscription gate bypass for the API (`RequireActiveSubscriptionGuard`).
 *
 * - `SKIP_SUBSCRIPTION_ENFORCEMENT=true|1|yes` — always skip (e.g. staging config).
 * - `SKIP_SUBSCRIPTION_ENFORCEMENT=false|0|no` — always enforce (even in development).
 * - Otherwise, when `NODE_ENV` is `development`, skip so local dev works without Stripe.
 */
export function isSubscriptionEnforcementDisabled(
  skipEnv: string | null | undefined,
  nodeEnv: string | null | undefined = process.env.NODE_ENV,
): boolean {
  const v = (skipEnv ?? "").trim().toLowerCase();
  if (v === "false" || v === "0" || v === "no") {
    return false;
  }
  if (v === "true" || v === "1" || v === "yes") {
    return true;
  }
  const n = (nodeEnv ?? "").trim().toLowerCase();
  return n === "development";
}
