import { Link, useLocation, useSearchParams } from "react-router";
import { cn } from "../../lib/utils";
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

const sidebarLinks = [
  { icon: LayoutGrid, label: "Catalog", to: "/catalog" },
  { icon: Search, label: "Search", to: "/catalog" },
  { icon: BookOpen, label: "My Lessons", to: "/watched-lessons" },
  { icon: Trophy, label: "Progress", to: "/profile?tab=progress" },
  { icon: User, label: "Profile", to: "/profile" },
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
  // lifted state — controlled by parent
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function CatalogSidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  welcomeName,
  englishLevel,
  // onSelectLevel,
  reserveTopNavSpace = true,
  collapsed,
  onCollapsedChange,
}: CatalogSidebarProps) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const sortedCategories = ["All", ...categories.filter(Boolean).sort()];

  const linkActive = (link: (typeof sidebarLinks)[number]) => {
    if (link.label === "Catalog") return pathname === "/catalog";
    if (link.label === "Search") return pathname.startsWith("/catalog/search");
    const tab = searchParams.get("tab");
    if (link.label === "Progress") {
      return pathname === "/profile" && tab === "progress";
    }
    if (link.label === "Profile") {
      return (
        pathname === "/profile" &&
        tab !== "progress" &&
        tab !== "settings"
      );
    }
    return pathname === link.to;
  };

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
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
              <p className="truncate text-foreground/70">
                {welcomeName?.trim() ? `Hi, ${welcomeName}` : "Welcome back!"}
              </p>
              <p className="text-sm font-semibold text-accent">
                {englishLevel?.trim() ? `• Level ${englishLevel}` : "Explys"}
              </p>
            </div>
          )}
        </div>

        <nav className="flex-col space-y-1 p-4">
          {sidebarLinks.map((link) => (
            <Link
              key={link.label}
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
          ))}
        </nav>

        {!collapsed && (
          <div className="space-y-4 border-t border-border p-4">
            <p className="mb-2 text-sm font-medium text-foreground">Level</p>
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
                  {level}
                </button>
              ))}
            </div>
          </div>
        )}

        {!collapsed && (
          <div className="space-y-4 border-t border-border p-4">
            <p className="mb-2 text-sm font-medium text-foreground">Category</p>
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
                  {category}
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
            {!collapsed && <span>Settings</span>}
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
          {sidebarLinks.slice(0, 5).map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-colors",
                linkActive(link) ? "text-primary" : "text-muted-foreground",
              )}
            >
              <link.icon className="h-5 w-5" />
              <span className="text-xs">{link.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
