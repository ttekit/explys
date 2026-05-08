import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { apiFetch, readApiErrorBody } from "../lib/api";
import type { PricingPlanId } from "../lib/pricingPlans";

export function usePricingCheckout() {
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const startCheckout = useCallback(
    async (
      planId: Extract<PricingPlanId, "light" | "smart" | "family">,
      opts: { isLoggedIn: boolean },
    ) => {
      if (!opts.isLoggedIn) {
        navigate("/loginForm", {
          replace: false,
          state: { from: "/pricing" },
        });
        return;
      }
      setCheckoutLoading(true);
      try {
        const res = await apiFetch("/billing/checkout", {
          method: "POST",
          body: JSON.stringify({ planId }),
        });
        if (!res.ok) {
          toast.error(await readApiErrorBody(res));
          return;
        }
        const data = (await res.json()) as { url?: string };
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        toast.error("Checkout could not be started.");
      } catch {
        toast.error("Network error. Is the API running?");
      } finally {
        setCheckoutLoading(false);
      }
    },
    [navigate],
  );

  return { startCheckout, checkoutLoading };
}
