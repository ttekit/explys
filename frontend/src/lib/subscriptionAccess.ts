import type { UserData } from "../context/UserContext";

/** Match backend `isSubscriptionEnforcementDisabled` (`SKIP_SUBSCRIPTION_ENFORCEMENT`). */
export function subscriptionEnforcementDisabled(): boolean {
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
