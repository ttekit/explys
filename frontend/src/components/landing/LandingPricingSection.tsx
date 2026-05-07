import { Link } from "react-router";
import PricingCards from "../pricing/PricingCards";
import { useUser } from "../../context/UserContext";
import { usePricingCheckout } from "../../hooks/usePricingCheckout";

/**
 * Pricing grid for the marketing home page (same plans as /pricing).
 */
export function LandingPricingSection() {
  const { isLoggedIn } = useUser();
  const { startCheckout, checkoutLoading } = usePricingCheckout();

  return (
    <section
      id="pricing"
      className="border-border border-t bg-background px-4 py-16 font-display sm:px-6 lg:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-muted-foreground md:text-lg">
            From essentials to adaptive AI and family plans — plus enterprise
            for schools.
          </p>
          <Link
            to="/pricing"
            className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Full pricing page
          </Link>
        </div>
        <PricingCards
          onSelectConsumerPlan={(id) => void startCheckout(id, { isLoggedIn })}
          checkoutDisabled={checkoutLoading}
        />
      </div>
    </section>
  );
}
