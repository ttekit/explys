import { Link } from "react-router";
import { CreditCard, ExternalLink } from "lucide-react";
import type { UserData } from "../../context/UserContext";
import { PRICING_PLANS } from "../../lib/pricingPlans";
import { useLandingLocale } from "../../context/LandingLocaleContext";

function planDisplayName(planId: string): string {
  const id = planId.trim().toLowerCase();
  const row = PRICING_PLANS.find((p) => p.id === id);
  return row?.name ?? planId;
}

/**
 * Displays current Stripe-backed subscription summary for the profile tab.
 */
export function ProfileSubscriptions({ user }: { user: UserData }) {
  const { messages } = useLandingLocale();
  const p = messages.profileSubscriptions;

  function statusLabel(raw: string): string {
    const s = raw.trim().toLowerCase();
    if (!s) return "—";
    if (s === "active") return p.statusActive;
    if (s === "canceled" || s === "cancelled") return p.statusCancelled;
    if (s === "past_due") return p.statusPastDue;
    if (s === "trialing") return p.statusTrial;
    return raw;
  }

  const planId = user.subscriptionPlan?.trim() ?? "";
  const status = user.subscriptionStatus?.trim() ?? "";
  const subId = user.stripeSubscriptionId?.trim() ?? "";
  const hasPlan = Boolean(planId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">
          {p.sectionTitle}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{p.sectionLead}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card/60 p-6">
        <div className="flex flex-wrap items-start gap-3">
          <div className="rounded-xl bg-primary/15 p-3 text-primary">
            <CreditCard className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            {!hasPlan ?
              <>
                <p className="font-medium text-foreground">{p.noSubscriptionTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground">{p.noSubscriptionBody}</p>
                <Link
                  to="/pricing"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {p.viewPricing}
                  <ExternalLink className="size-3.5 opacity-80" />
                </Link>
              </>
            : <>
                <p className="font-medium text-foreground">{planDisplayName(planId)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {p.statusPrefix}{" "}
                  <span className="font-medium text-foreground">
                    {status ? statusLabel(status) : "—"}
                  </span>
                </p>
                {subId ?
                  <p className="mt-2 font-mono text-xs text-muted-foreground break-all">
                    {p.subscriptionIdPrefix} {subId}
                  </p>
                : null}
                <Link
                  to="/pricing"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {p.plansUpgrades}
                  <ExternalLink className="size-3.5 opacity-80" />
                </Link>
              </>
            }
          </div>
        </div>
      </div>
    </div>
  );
}
