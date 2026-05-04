import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { capturePageView, initPosthog } from "../lib/analytics";

/**
 * Tracks SPA navigations once PostHog env is configured (`VITE_PUBLIC_POSTHOG_KEY`).
 */
export default function AnalyticsLayout() {
  const location = useLocation();

  useEffect(() => {
    initPosthog();
  }, []);

  useEffect(() => {
    capturePageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  return <Outlet />;
}
