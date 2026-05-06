import { Link, NavLink } from "react-router";
import { useState } from "react";
import { ChameleonMascot } from "../ChameleonMascot";
import { cn } from "../../lib/utils";
import { Menu, X } from "lucide-react";
import { useUser } from "../../context/UserContext";

const appNavLinks = [
  { to: "/catalog", label: "Catalog" },
  { to: "/level-test", label: "Level Test" },
] as const;

const landingNavLinks = [
  { hash: "#why-exply", label: "Why Choose Exply?" },
  { hash: "#how-exply-works", label: "How Exply Works" },
  { hash: "#start-journey", label: "Start Your Journey" },
] as const;

type LandingHeaderProps = {
  /** Marketing home uses in-page section links; other surfaces can use app routes. */
  variant?: "landing" | "app";
};

export function LandingHeader({ variant = "app" }: LandingHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isLoggedIn, isLoading } = useUser();
  const useLandingNav = variant === "landing";
  const showAuthButtons = !isLoading && !isLoggedIn;
  const showCatalogCta = !isLoading && isLoggedIn && useLandingNav;

  const handleLandingNavClick = () => setMobileMenuOpen(false);

  return (
    <header className="fixed top-0 right-0 left-0 z-50 border-border border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="group flex items-center gap-2"
          onClick={() => setMobileMenuOpen(false)}
        >
          <ChameleonMascot size="sm" mood="happy" animate={false} />
          <span className="font-display text-xl font-bold text-foreground transition-colors group-hover:text-primary">
            Exply
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {useLandingNav
            ? landingNavLinks.map((link) => (
                <a
                  key={link.hash}
                  href={link.hash}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </a>
              ))
            : appNavLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/catalog"}
                  className={({ isActive }) =>
                    cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      isActive ? "text-primary" : "text-muted-foreground",
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
        </nav>

        {showAuthButtons ? (
          <div className="hidden items-center gap-3 md:flex">
            <Link
              to="/loginForm"
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              to="/registrationMain"
              className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started
            </Link>
          </div>
        ) : showCatalogCta ? (
          <div className="hidden md:flex">
            <NavLink
              to="/catalog"
              end
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-primary/90 text-primary-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                )
              }
            >
              Catalog
            </NavLink>
          </div>
        ) : (
          <div className="hidden md:block" aria-hidden />
        )}

        <button
          type="button"
          className="p-2 text-foreground md:hidden"
          onClick={() => setMobileMenuOpen((o) => !o)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-border border-b bg-card md:hidden">
          <nav className="flex flex-col gap-2 px-4 py-4">
            {useLandingNav
              ? landingNavLinks.map((link) => (
                  <a
                    key={link.hash}
                    href={link.hash}
                    onClick={handleLandingNavClick}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                  >
                    {link.label}
                  </a>
                ))
              : appNavLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === "/catalog"}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:bg-muted",
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
            {showAuthButtons ? (
              <div className="mt-4 flex flex-col gap-2 border-border border-t pt-4">
                <Link
                  to="/loginForm"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-4 py-2 text-left text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Log in
                </Link>
                <Link
                  to="/registrationMain"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Get Started
                </Link>
              </div>
            ) : showCatalogCta ? (
              <div className="mt-4 border-border border-t pt-4">
                <NavLink
                  to="/catalog"
                  end
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center justify-center rounded-xl py-2.5 text-center text-sm font-semibold transition-colors",
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "bg-primary text-primary-foreground hover:bg-primary/90",
                    )
                  }
                >
                  Catalog
                </NavLink>
              </div>
            ) : null}
          </nav>
        </div>
      )}
    </header>
  );
}
