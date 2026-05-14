import { Link } from "react-router";
import Button from "../../components/Button";
import React, { useCallback, useEffect, useId, useState } from "react";
import { useLandingLocale } from "../../context/LandingLocaleContext";

const selectClass =
  "bg-zinc-950 text-white border border-zinc-800 font-bold rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 w-full md:w-auto md:py-1";

const Navigation: React.FC = () => {
  const { messages } = useLandingLocale();
  const n = messages.navigation;
  const c = messages.common;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, closeMenu]);

  const NavControls = ({ mobile }: { mobile?: boolean }) => (
    <>
      <div
        className={
          mobile ? "flex w-full flex-col gap-3" : "flex items-center gap-4"
        }
      >
        <select className={selectClass} aria-label={n.filterGenreAria}>
          <option>{n.genres}</option>
          <option>{n.allGenres}</option>
          <option>{n.comedy}</option>
          <option>{n.drama}</option>
          <option>{n.sciFi}</option>
          <option>{n.thriller}</option>
        </select>

        <select className={selectClass} aria-label={n.languageAria}>
          <option>{n.language}</option>
          <option>{n.english}</option>
          <option>{n.ukrainian}</option>
          <option>{n.german}</option>
          <option>{n.french}</option>
        </select>
      </div>

      <div
        className={
          mobile
            ? "flex w-full flex-col gap-2 sm:flex-row"
            : "flex items-center gap-2.5"
        }
      >
        <Link to="/loginForm" className={mobile ? "w-full sm:flex-1" : ""} onClick={closeMenu}>
          <Button className="mt-0 w-full bg-transparent border border-white text-white hover:bg-white hover:text-black">
            {n.login}
          </Button>
        </Link>

        <Link to="/registrationMain" className={mobile ? "w-full sm:flex-1" : ""} onClick={closeMenu}>
          <Button className="mt-0 w-full bg-blue-500 text-white hover:bg-blue-600">
            {n.register}
          </Button>
        </Link>
      </div>
    </>
  );

  return (
    <nav className="w-full border-b border-zinc-800 bg-black">
      <div className="mx-auto flex max-w-7xl flex-col px-4 py-3">
        <div className="flex w-full items-center justify-between gap-3">
          <Link
            to="/catalog"
            className="shrink-0 text-2xl font-bold tracking-tighter text-white"
            onClick={closeMenu}
          >
            Ex<span className="text-blue-500">ply</span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            <NavControls />
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-700 text-white md:hidden"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? c.closeMenu : c.openMenu}
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {menuOpen ? (
          <div
            id={menuId}
            className="mt-4 flex flex-col gap-4 border-t border-zinc-800 pt-4 md:hidden"
          >
            <NavControls mobile />
          </div>
        ) : null}
      </div>
    </nav>
  );
};

export default Navigation;
