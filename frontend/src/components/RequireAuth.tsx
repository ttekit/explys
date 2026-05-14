import { Navigate, Outlet, useLocation } from "react-router";
import { useUser } from "../context/UserContext";
import { useLandingLocale } from "../context/LandingLocaleContext";

/**
 * Renders child routes only when `UserContext` has finished loading and the user is logged in.
 * Otherwise redirects to login (or home while loading is optional — we use a minimal spinner).
 */
export default function RequireAuth() {
  const { isLoggedIn, isLoading } = useUser();
  const location = useLocation();
  const { messages } = useLandingLocale();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">{messages.common.loading}</p>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <Navigate
        to="/loginForm"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
}
