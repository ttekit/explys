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

export function isSubscriptionEnforcementDisabled(
  skipEnv: string | null | undefined,
): boolean {
  const v = (skipEnv ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}
