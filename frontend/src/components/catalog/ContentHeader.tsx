import { Link, useLocation } from "react-router";
import { cn } from "../../lib/utils";
import { useUser } from "../../context/UserContext";
import { useCallback, useEffect, useId, useState } from "react";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { useAppMessages } from "../../hooks/useAppMessages";
import { LandingLanguageToggle } from "../landing/LandingLanguageToggle";
import { ThemeToggle } from "../ThemeToggle";

export type ContentHeaderVariant = "app" | "landing";

type ContentHeaderProps = {
  variant?: ContentHeaderVariant;
};

const linkLanding =
  "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer";

const linkApp =
  "whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors cursor-pointer";

export default function ContentHeader({ variant = "app" }: ContentHeaderProps) {
  const { messages } = useLandingLocale();
  const landingI18n = messages.header;
  const landingCta = messages.cta;
  const appHeader = useAppMessages().appHeader;
  const common = useAppMessages().common;
  const { pathname, hash } = useLocation();
  const { isLoggedIn, user } = useUser();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const isFullyRegistered = isLoggedIn && user?.hasCompletedPlacement;

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

  const locationKey = `${pathname}#${hash}`;
  const [prevLocationKey, setPrevLocationKey] = useState(locationKey);
  if (locationKey !== prevLocationKey) {
    setPrevLocationKey(locationKey);
    setMenuOpen(false);
  }

  const appNavLinks = [
    { label: appHeader.home, to: "/" },
    { label: appHeader.pricing, to: "/pricing" },
    ...(isFullyRegistered
      ? [
          { label: appHeader.catalog, to: "/catalog" },
          { label: appHeader.learningPlan, to: "/learning-plan" as const },
        ]
      : []),
    { label: appHeader.levelTest, to: "/level-test" },
  ];

  return (
    <>
      <header className="fixed top-(--email-verification-banner-height,0px) z-999 flex h-18 w-full items-center gap-1 overflow-x-hidden border-b border-border bg-[--header-background] px-2 font-display backdrop-blur-md sm:gap-2 sm:px-3 md:px-4">
        <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-3">
          <Link to="/">
            <img
              src={`${import.meta.env.BASE_URL}Icon.svg`}
              alt="Explys Logo"
              className="h-12 w-14 shrink-0 object-contain hover:cursor-pointer sm:h-15 sm:w-16"
            />
          </Link>

          <p className="hidden truncate text-xl font-bold text-foreground sm:block sm:text-2xl md:text-[35px]">
            Explys
          </p>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center overflow-x-auto">
          <nav
            className={cn(
              "hidden lg:flex min-w-0 max-w-full flex-nowrap items-center gap-1 overflow-x-auto rounded-full border border-border bg-background/50 px-2 py-1.5 shadow-sm backdrop-blur-md sm:gap-2 sm:px-3 scrollbar-hide",
              variant === "landing" && "md:gap-1 lg:gap-1.5",
            )}
          >
            {variant === "landing" ? (
              <>
                {landingI18n.navLinks.map((link) => {
                  const active = pathname === "/" && hash === `#${link.hash}`;
                  return (
                    <Link
                      key={link.hash}
                      to={{ pathname: "/", hash: `#${link.hash}` }}
                      className={cn(
                        linkLanding,
                        active
                          ? "bg-secondary text-foreground shadow-sm"
                          : "text-muted-foreground bg-secondary/20 hover:bg-secondary/60 hover:text-foreground",
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </>
            ) : (
              appNavLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    linkApp,
                    pathname === link.to
                      ? "bg-secondary text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))
            )}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:gap-3">
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {variant === "landing" ? <LandingLanguageToggle /> : null}
          </div>

          {/* Обновленные кнопки в шапке */}
          <div className="hidden items-center gap-2 sm:gap-3 lg:flex">
            {isFullyRegistered ? (
              <Link
                to="/catalog"
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer sm:px-6"
              >
                {variant === "landing"
                  ? landingI18n.catalog
                  : appHeader.catalog}
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <button
                    type="button"
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary cursor-pointer sm:px-5"
                  >
                    {variant === "landing"
                      ? landingI18n.logIn
                      : appHeader.logIn}
                  </button>
                </Link>
                <Link to="/register">
                  <button
                    type="button"
                    className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer sm:px-6"
                  >
                    {variant === "landing"
                      ? landingCta.startFree
                      : appHeader.getStarted}
                  </button>
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            className="inline-flex hover:cursor-pointer h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground lg:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={
              variant === "landing"
                ? menuOpen
                  ? landingI18n.closeMenu
                  : landingI18n.openMenu
                : menuOpen
                  ? common.closeMenu
                  : common.openMenu
            }
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
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
            ) : (
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Обновленное мобильное меню */}
      {menuOpen ? (
        <>
          <button
            type="button"
            tabIndex={-1}
            className="fixed inset-0 top-[calc(var(--email-verification-banner-height,0px)+4.5rem)] z-998 bg-background/80 backdrop-blur-sm lg:hidden"
            aria-hidden
            onClick={closeMenu}
          />
          <div
            id={menuId}
            className="fixed top-[calc(var(--email-verification-banner-height,0px)+4.5rem)] right-0 left-0 z-999 max-h-[min(70vh,calc(100dvh-var(--email-verification-banner-height,0px)-4.5rem))] overflow-y-auto border-b border-border bg-[--header-background] px-4 py-4 font-display shadow-lg lg:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {variant === "landing" ? (
                <>
                  {landingI18n.navLinks.map((link) => {
                    const active = pathname === "/" && hash === `#${link.hash}`;
                    return (
                      <Link
                        key={link.hash}
                        to={{ pathname: "/", hash: `#${link.hash}` }}
                        onClick={closeMenu}
                        className={cn(
                          "rounded-xl px-4 py-3 text-base font-medium transition-colors",
                          active
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                        )}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </>
              ) : (
                appNavLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={closeMenu}
                    className={cn(
                      "rounded-xl px-4 py-3 text-base font-medium transition-colors",
                      pathname === link.to
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                ))
              )}

              <div className="mt-3 flex flex-col gap-3 border-border border-t pt-5">
                {isFullyRegistered ? (
                  <Link
                    to="/catalog"
                    onClick={closeMenu}
                    className="w-full rounded-xl bg-primary px-4 py-3.5 text-center text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                  >
                    {variant === "landing"
                      ? landingI18n.catalog
                      : appHeader.catalog}
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={closeMenu}>
                      <button
                        type="button"
                        className="w-full rounded-xl px-4 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:bg-secondary cursor-pointer border border-border"
                      >
                        {variant === "landing"
                          ? landingI18n.logIn
                          : appHeader.logIn}
                      </button>
                    </Link>
                    <Link to="/register" onClick={closeMenu}>
                      <button
                        type="button"
                        className="w-full rounded-xl bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer"
                      >
                        {variant === "landing"
                          ? landingCta.startFree
                          : appHeader.getStarted}
                      </button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
