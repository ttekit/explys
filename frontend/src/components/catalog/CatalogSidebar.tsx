import { Link, useLocation, useSearchParams } from "react-router";
import { useMemo } from "react";
import { cn } from "../../lib/utils";
import { formatMessage } from "../../lib/formatMessage";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Search,
  Settings,
  Trophy,
  User,
  CircleUser,
} from "lucide-react";

type SidebarNavId = "catalog" | "search" | "myLessons" | "progress" | "profile";

const SIDEBAR_LINK_DEFS: readonly {
  readonly id: SidebarNavId;
  readonly icon: typeof LayoutGrid;
  readonly to: string;
}[] = [
  { id: "catalog", icon: LayoutGrid, to: "/catalog" },
  { id: "search", icon: Search, to: "/catalog" },
  { id: "myLessons", icon: BookOpen, to: "/watched-lessons" },
  { id: "progress", icon: Trophy, to: "/profile?tab=progress" },
  { id: "profile", icon: User, to: "/profile" },
] as const;

const LEVELS = ["All", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

interface CatalogSidebarProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  welcomeName?: string;
  englishLevel?: string;
  onSelectLevel: (level: string) => void;
  /** When false, sidebar/backdrop anchor to viewport top (use when pages omit the fixed app navbar). */
  reserveTopNavSpace?: boolean;
  /** Catalog page: Spotlight command palette is open (highlights Search nav). */
  catalogSpotlightOpen?: boolean;
  /** Catalog page only: open Spotlight from sidebar Search. */
  onOpenCatalogSpotlight?: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function CatalogSidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  welcomeName,
  englishLevel,
  reserveTopNavSpace = true,
  catalogSpotlightOpen = false,
  onOpenCatalogSpotlight,
  collapsed,
  onCollapsedChange,
}: CatalogSidebarProps) {
  const { messages } = useLandingLocale();
  const c = messages.common;
  const s = messages.catalogShell;
  const sidebarLinks = useMemo(
    () =>
      SIDEBAR_LINK_DEFS.map((def) => ({
        ...def,
        label:
          def.id === "catalog" ? s.navCatalog
          : def.id === "search" ? s.navSearch
          : def.id === "myLessons" ? s.navMyLessons
          : def.id === "progress" ? s.navProgress
          : s.navProfile,
      })),
    [s],
  );
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const sortedCategories = ["All", ...categories.filter(Boolean).sort()];

  const linkActive = (link: (typeof sidebarLinks)[number]): boolean => {
    if (link.id === "catalog") {
      return pathname === "/catalog" && !catalogSpotlightOpen;
    }
    if (link.id === "search") {
      return pathname === "/catalog" && !!catalogSpotlightOpen;
    }
    const tab = searchParams.get("tab");
    if (link.id === "progress") {
      return pathname === "/profile" && tab === "progress";
    }
    if (link.id === "profile") {
      return (
        pathname === "/profile" &&
        tab !== "progress" &&
        tab !== "settings"
      );
    }
    return pathname === link.to;
  };

  const greeting =
    welcomeName?.trim() ?
      formatMessage(s.greetingHi, { name: welcomeName.trim() })
    : s.welcomeBackExclaim;
  const LEVEL_ALL = "All" as const;
  const levelLine =
    englishLevel?.trim() ?
      formatMessage(s.levelWithDot, {
        prefix: s.sectionLevel,
        level: englishLevel.trim(),
      })
    : s.brandsFallback;

  return (
    <>
      <aside
        className={cn(
          "fixed bottom-0 left-0 z-50 hidden flex-col border-r border-border bg-card font-display transition-all duration-600 lg:flex",
          reserveTopNavSpace ? "top-18" : "top-0",
          collapsed ? "w-20" : "w-64 shadow-2xl",
        )}
      >
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className="absolute top-6 hover:cursor-pointer -right-3 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted"
          aria-label={collapsed ? c.expandSidebar : c.collapseSidebar}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>

        <div
          className={cn(
            "mx-3 my-3 flex items-center gap-3 rounded-3xl border border-border p-1",
            collapsed && "justify-center",
          )}
        >
          <CircleUser className="text-muted-foreground m-3 hover:cursor-pointer shrink-0" />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-foreground/70">{greeting}</p>
              <p className="text-sm font-semibold text-accent">{levelLine}</p>
            </div>
          )}
        </div>

        <nav className="flex-col space-y-1 p-4">
          {sidebarLinks.map((link) => {
            if (link.id === "search") {
              const active = linkActive(link);
              const itemClass = cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2",
              );
              return pathname === "/catalog" && onOpenCatalogSpotlight ?
                  <button
                    key={link.id}
                    type="button"
                    className={itemClass}
                    onClick={() => onOpenCatalogSpotlight()}
                  >
                    <link.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{link.label}</span>}
                  </button>
                : <Link
                    key={link.id}
                    to="/catalog"
                    state={{ openSpotlight: true }}
                    className={itemClass}
                  >
                    <link.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{link.label}</span>}
                  </Link>;
            }
            return (
              <Link
                key={link.id}
                to={link.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  linkActive(link)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-2",
                )}
              >
                <link.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="space-y-4 border-t border-border p-4">
            <p className="mb-2 text-sm font-medium text-foreground">
              {s.sectionLevel}
            </p>
            <div className="flex flex-wrap gap-1">
              {LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {}}
                  className={cn(
                    "rounded px-2 py-1 text-xs font-medium transition-colors hover:cursor-pointer",
                    englishLevel === level
                      ? "bg-primary text-primary-foreground shadow-inner"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {level === LEVEL_ALL ? c.filterAll : level}
                </button>
              ))}
            </div>
          </div>
        )}

        {!collapsed && (
          <div className="space-y-4 border-t border-border p-4">
            <p className="mb-2 text-sm font-medium text-foreground">
              {s.sectionCategory}
            </p>
            <div className="flex flex-wrap gap-1">
              {sortedCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => onSelectCategory(category)}
                  className={cn(
                    "rounded px-2 py-1 text-xs font-medium transition-colors hover:cursor-pointer",
                    selectedCategory === category
                      ? "bg-accent text-accent-foreground shadow-inner"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {category === LEVEL_ALL ? c.filterAll : category}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto border-t border-border p-4">
          <Link
            to="/profile?tab=settings"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
              pathname === "/profile" && searchParams.get("tab") === "settings"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-2",
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{s.settings}</span>}
          </Link>
        </div>
      </aside>

      {!collapsed && (
        <div
          className={cn(
            "fixed right-0 bottom-0 left-0 z-40 hidden bg-black/40 backdrop-blur-[3px] lg:block",
            reserveTopNavSpace ? "top-18" : "top-0",
          )}
          onClick={() => onCollapsedChange(true)}
        />
      )}

      <nav className="fixed right-0 bottom-0 left-0 z-40 border-t border-border bg-card lg:hidden">
        <div className="flex items-center justify-around py-2">
          {sidebarLinks.slice(0, 5).map((link) => {
            if (link.id === "search") {
              const active = linkActive(link);
              const itemClass = cn(
                "flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              );
              return pathname === "/catalog" && onOpenCatalogSpotlight ?
                  <button
                    key={link.id}
                    type="button"
                    className={itemClass}
                    onClick={() => onOpenCatalogSpotlight()}
                  >
                    <link.icon className="h-5 w-5" />
                    <span className="text-xs">{link.label}</span>
                  </button>
                : <Link
                    key={link.id}
                    to="/catalog"
                    state={{ openSpotlight: true }}
                    className={itemClass}
                  >
                    <link.icon className="h-5 w-5" />
                    <span className="text-xs">{link.label}</span>
                  </Link>;
            }
            return (
              <Link
                key={link.id}
                to={link.to}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-colors",
                  linkActive(link) ? "text-primary" : "text-muted-foreground",
                )}
              >
                <link.icon className="h-5 w-5" />
                <span className="text-xs">{link.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
