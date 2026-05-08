import { Link, useLocation } from "react-router";
import { cn } from "../../lib/utils";
import { useUser } from "../../context/UserContext";
import { useCallback, useEffect, useId, useState } from "react";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { LandingLanguageToggle } from "../landing/LandingLanguageToggle";

export type ContentHeaderVariant = "app" | "landing";

type ContentHeaderProps = {
  variant?: ContentHeaderVariant;
};

const linkLanding = (
  "whitespace-nowrap rounded-full px-2.5 py-2 text-xs transition-all sm:px-4 sm:text-sm lg:px-5 lg:text-base"
);

const linkApp =
  "rounded-full px-6 py-2 text-md transition-all";

export default function ContentHeader({
  variant = "app",
}: ContentHeaderProps) {
  const { messages } = useLandingLocale();
  const landingI18n = messages.header;
  const { pathname, hash } = useLocation();
  const { isLoggedIn, user } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname, hash]);

  const appNavLinks = [
    { label: "Home", to: "/" },
    { label: "Catalog", to: "/catalog" },
    { label: "Pricing", to: "/pricing" },
    ...(isLoggedIn && user?.hasCompletedPlacement
      ? [{ label: "Learning plan", to: "/learning-plan" as const }]
      : []),
    { label: "Level test", to: "/level-test" },
  ];

  return (
    <>
      <header className="fixed top-0 z-999 flex h-18 w-full items-center justify-between border-b border-border bg-[--header-background] px-3 font-display backdrop-blur-md md:px-4">
        <div className="flex min-w-0 shrink items-center gap-2 sm:gap-3">
          <img
            src="/Icon.svg"
            alt=""
            className="m-1 h-17 w-15 shrink-0 rounded-full p-1"
          />
          <p className="truncate text-2xl font-bold sm:text-3xl md:text-[35px]">
            Explys
          </p>
        </div>

        <nav
          className={cn(
            "absolute left-1/2 hidden max-w-[min(100vw-12rem,52rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-1 rounded-full bg-slate-900/50 px-2 py-1 backdrop-blur-3xl md:flex sm:max-w-none sm:flex-nowrap sm:gap-2 sm:px-3",
            variant === "landing" && "md:gap-1 lg:gap-2",
          )}
        >
          {variant === "landing" ?
            <>
              {landingI18n.navLinks.map((link) => {
                const active =
                  pathname === "/" && hash === `#${link.hash}`;
                return (
                  <Link
                    key={link.hash}
                    to={{ pathname: "/", hash: link.hash }}
                    className={cn(
                      linkLanding,
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
                  linkLanding,
                  pathname === "/pricing"
                    ? "text-accent hover:text-(--accent-hover)"
                    : "text-foreground/70 hover:text-white",
                )}
              >
                {landingI18n.pricing}
              </Link>
            </>
          : appNavLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  linkApp,
                  pathname === link.to
                    ? "text-accent hover:text-(--accent-hover)"
                    : "text-foreground/70 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {variant === "landing" ?
            <LandingLanguageToggle />
          : null}

          <div className="hidden items-center gap-2 sm:gap-4 md:flex">
          {isLoggedIn ?
            <Link
              to="/catalog"
              className="rounded-[15px] bg-primary px-4 py-2.5 text-sm font-semibold text-foreground/70 shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)] transition-all hover:cursor-pointer hover:bg-purple-hover hover:text-white sm:px-6"
            >
              {variant === "landing" ? landingI18n.catalog : "Catalog"}
            </Link>
          : <>
              <Link to="/loginForm">
                <button
                  type="button"
                  className="rounded-[15px] px-4 py-2.5 text-sm font-medium text-foreground/70 transition-all hover:cursor-pointer hover:bg-muted-foreground/10 hover:text-white sm:px-6"
                >
                  {variant === "landing" ? landingI18n.logIn : "Log in"}
                </button>
              </Link>
              <Link to="/registrationMain">
                <button
                  type="button"
                  className="rounded-[15px] bg-primary px-4 py-2.5 text-sm font-semibold text-foreground/70 shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)] transition-all hover:cursor-pointer hover:bg-purple-hover hover:text-white sm:px-6"
                >
                  {variant === "landing" ? landingI18n.getStarted : "Get started"}
                </button>
              </Link>
            </>
          }
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground md:hidden"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label={
            variant === "landing" ?
              menuOpen ?
                landingI18n.closeMenu
              : landingI18n.openMenu
            : menuOpen ?
              "Close menu"
            : "Open menu"
          }
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ?
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          : <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          }
        </button>
        </div>
      </header>

      {menuOpen ?
        <>
          <button
            type="button"
            tabIndex={-1}
            className="fixed inset-0 top-18 z-[998] bg-background/80 backdrop-blur-sm md:hidden"
            aria-hidden
            onClick={closeMenu}
          />
          <div
            id={menuId}
            className="fixed top-18 right-0 left-0 z-[999] max-h-[min(70vh,calc(100dvh-4.5rem))] overflow-y-auto border-b border-border bg-[--header-background] px-4 py-4 font-display shadow-lg md:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {variant === "landing" ?
                <>
                  {landingI18n.navLinks.map((link) => {
                    const active =
                      pathname === "/" && hash === `#${link.hash}`;
                    return (
                      <Link
                        key={link.hash}
                        to={{ pathname: "/", hash: link.hash }}
                        onClick={closeMenu}
                        className={cn(
                          "rounded-xl px-4 py-3 text-base transition-all",
                          active
                            ? "text-accent"
                            : "text-foreground/70 hover:bg-muted/50 hover:text-white",
                        )}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                  <Link
                    to="/pricing"
                    onClick={closeMenu}
                    className={cn(
                      "rounded-xl px-4 py-3 text-base transition-all",
                      pathname === "/pricing"
                        ? "text-accent"
                        : "text-foreground/70 hover:bg-muted/50 hover:text-white",
                    )}
                  >
                    {landingI18n.pricing}
                  </Link>
                </>
              : appNavLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={closeMenu}
                    className={cn(
                      "rounded-xl px-4 py-3 text-base transition-all",
                      pathname === link.to
                        ? "text-accent"
                        : "text-foreground/70 hover:bg-muted/50 hover:text-white",
                    )}
                  >
                    {link.label}
                  </Link>
                ))}

              <div className="mt-3 flex flex-col gap-2 border-border border-t pt-4">
                {isLoggedIn ?
                  <Link
                    to="/catalog"
                    onClick={closeMenu}
                    className="rounded-[15px] bg-primary px-4 py-3 text-center text-sm font-semibold text-foreground/70 shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)] transition-all hover:bg-purple-hover hover:text-white"
                  >
                    {variant === "landing" ? landingI18n.catalog : "Catalog"}
                  </Link>
                : <>
                    <Link to="/loginForm" onClick={closeMenu}>
                      <button
                        type="button"
                        className="w-full rounded-[15px] py-3 text-center text-sm font-medium text-foreground/70 transition-all hover:bg-muted-foreground/10 hover:text-white"
                      >
                        {variant === "landing" ? landingI18n.logIn : "Log in"}
                      </button>
                    </Link>
                    <Link to="/registrationMain" onClick={closeMenu}>
                      <button
                        type="button"
                        className="w-full rounded-[15px] bg-primary py-3 text-center text-sm font-semibold text-foreground/70 shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)] transition-all hover:bg-purple-hover hover:text-white"
                      >
                        {variant === "landing" ?
                          landingI18n.getStarted
                        : "Get started"}
                      </button>
                    </Link>
                  </>
                }
              </div>
            </div>
          </div>
        </>
      : null}
    </>
  );
}
