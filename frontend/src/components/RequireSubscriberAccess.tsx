import { Navigate, Outlet, useLocation } from "react-router";
import { useUser } from "../context/UserContext";
import { useLandingLocale } from "../context/LandingLocaleContext";
import {
  subscriptionEnforcementDisabled,
  userMayUseLearnerApp,
} from "../lib/subscriptionAccess";

/**
 * After auth: blocks catalog, lessons, profile, etc. until the account has an
 * active/trialing subscription (or qualifies for exemptions). Does not wrap `/subscribe`.
 */
export default function RequireSubscriberAccess() {
  const { user, isLoading } = useUser();
  const location = useLocation();
  const { messages } = useLandingLocale();

  if (subscriptionEnforcementDisabled()) {
    return <Outlet />;
  }

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">{messages.common.loading}</p>
      </div>
    );
  }

  if (!userMayUseLearnerApp(user)) {
    const checkoutSuccess =
      location.pathname === "/catalog" &&
      new URLSearchParams(location.search).get("checkout") === "success";
    if (checkoutSuccess) {
      return <Outlet />;
    }
    return (
      <Navigate
        to="/subscribe"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}
