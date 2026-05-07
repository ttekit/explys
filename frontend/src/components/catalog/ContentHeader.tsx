import { Link, useLocation } from "react-router";
import { cn } from "../../lib/utils";

export default function ContentHeader() {
  const { pathname } = useLocation();

  const navLinks = [
    { label: "Home", to: "/" },
    { label: "Catalog", to: "/catalog" },
    { label: "Level test", to: "/level-test" },
  ];

  return (
    <>
      <header className="fixed top-0 z-999 flex h-18 w-full font-display items-center justify-between border-b border-border bg-[--header-background] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src="/Icon.svg" className="w-15 h-17 p-1 rounded-full m-1" />
          <p className="text-[35px] font-display font-bold">Explys</p>
        </div>

        <nav className="absolute left-1/2 flex font-display -translate-x-1/2 items-center gap-3 rounded-full bg-slate-900/50 py-1 px-3 backdrop-blur-3xl">
          {navLinks.map((link) => (
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
        </div>
      </header>
    </>
  );
}
3;
