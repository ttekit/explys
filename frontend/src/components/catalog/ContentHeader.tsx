import { Link, useLocation } from "react-router";
import { cn } from "../../lib/utils";
import { useUser } from "../../context/UserContext";

const LANDING_NAV = [
  { label: "Why Choose Explys", hash: "why-choose-explys" },
  { label: "How Explys Works", hash: "how-explys-works" },
  { label: "Ready to Start", hash: "ready-to-start" },
] as const;

export type ContentHeaderVariant = "app" | "landing";

type ContentHeaderProps = {
  variant?: ContentHeaderVariant;
};

export default function ContentHeader({
  variant = "app",
}: ContentHeaderProps) {
  const { pathname, hash } = useLocation();
  const { isLoggedIn, user } = useUser();

  const appNavLinks = [
    { label: "Home", to: "/" },
    { label: "Catalog", to: "/catalog" },
    { label: "Pricing", to: "/pricing" },
    ...(isLoggedIn && user?.hasCompletedPlacement ?
      [{ label: "Learning plan", to: "/learning-plan" as const }]
    : []),
    { label: "Level test", to: "/level-test" },
  ];

  return (
    <>
      <header className="fixed top-0 z-999 flex h-18 w-full font-display items-center justify-between border-b border-border bg-[--header-background] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src="/Icon.svg" className="w-15 h-17 p-1 rounded-full m-1" />
          <p className="text-[35px] font-display font-bold">Explys</p>
        </div>

        <nav
          className={cn(
            "absolute left-1/2 flex max-w-[min(100vw-12rem,52rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-full bg-slate-900/50 px-2 py-1 backdrop-blur-3xl sm:max-w-none sm:flex-nowrap sm:gap-2 sm:px-3",
            variant === "landing" && "md:gap-1 lg:gap-2",
          )}
        >
          {variant === "landing" ?
            <>
              {LANDING_NAV.map((link) => {
                const active =
                  pathname === "/" && hash === `#${link.hash}`;
                return (
                  <Link
                    key={link.hash}
                    to={{ pathname: "/", hash: link.hash }}
                    className={cn(
                      "whitespace-nowrap rounded-full px-2.5 py-2 text-xs transition-all sm:px-4 sm:text-sm lg:px-5 lg:text-base",
                      active
                        ? "text-accent hover:text-(--accent-hover)"
                        : "text-foreground/70 hover:text-white",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
              <Link
                to="/pricing"
                className={cn(
                  "whitespace-nowrap rounded-full px-2.5 py-2 text-xs transition-all sm:px-4 sm:text-sm lg:px-5 lg:text-base",
                  pathname === "/pricing"
                    ? "text-accent hover:text-(--accent-hover)"
                    : "text-foreground/70 hover:text-white",
                )}
              >
                Pricing
              </Link>
            </>
          : appNavLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "rounded-full px-6 py-2 text-md transition-all",
                  pathname === link.to
                    ? "text-accent hover:text-(--accent-hover)"
                    : "text-foreground/70 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            ))}
        </nav>

        <div className="flex items-center gap-4 mr-3">
          {isLoggedIn ?
            <Link
              to="/catalog"
              className="rounded-[15px] bg-primary px-6 py-2.5 text-sm font-semibold text-foreground/70 transition-all hover:cursor-pointer hover:bg-purple-hover hover:text-white shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]"
            >
              Catalog
            </Link>
          : <>
              <Link to="/loginForm">
                <button className="text-sm font-medium text-foreground/70 hover:text-white py-2.5 px-6 transition-all rounded-[15px] hover:bg-muted-foreground/10 hover:cursor-pointer">
                  Log in
                </button>
              </Link>
              <Link to="/registrationMain">
                <button className="rounded-[15px] bg-primary px-6 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]">
                  Get started
                </button>
              </Link>
            </>
          }
        </div>
      </header>
    </>
  );
}
