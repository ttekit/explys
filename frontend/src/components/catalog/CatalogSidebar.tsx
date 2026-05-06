import { Link, useLocation } from "react-router";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { ChameleonMascot } from "../ChameleonMascot";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Search,
  Settings,
  Trophy,
  User,
} from "lucide-react";

const sidebarLinks = [
  { icon: LayoutGrid, label: "Catalog", to: "/catalog" },
  { icon: Search, label: "Search", to: "/catalog" },
  { icon: BookOpen, label: "Watched Lessons", to: "/watched-lessons" },
  { icon: Trophy, label: "Progress", to: "/profile?tab=progress" },
  { icon: User, label: "Profile", to: "/profile" },
] as const;

interface CatalogSidebarProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  welcomeName?: string;
  englishLevel?: string;
  /** When false, hides category chips (e.g. on profile pages). Default true. */
  showCategoryFilter?: boolean;
}

export function CatalogSidebar({
  categories,
  selectedCategory,
  onSelectCategory,
  welcomeName,
  englishLevel,
  showCategoryFilter = true,
}: CatalogSidebarProps) {
  const { pathname, search } = useLocation();
  const profileTab = new URLSearchParams(search).get("tab");
  const [collapsed, setCollapsed] = useState(false);

  const sortedCategories = ["All", ...categories.filter(Boolean).sort()];

  const isProfilePath =
    pathname === "/profile" || pathname === "/profileMain";

  const linkActive = (link: (typeof sidebarLinks)[number]) => {
    if (link.label === "Catalog") return pathname === "/catalog";
    if (link.label === "Search") return pathname.startsWith("/catalog/search");
    if (link.label === "Progress") {
      return isProfilePath && profileTab === "progress";
    }
    if (link.label === "Profile") {
      return isProfilePath && profileTab !== "progress";
    }
    return pathname === link.to.split("?")[0];
  };

  return (
    <>
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 hidden flex-col border-border border-r bg-card transition-all duration-300 lg:flex",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-6 -right-3 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted"
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
            "flex items-center gap-3 border-border border-b p-4",
            collapsed && "justify-center",
          )}
        >
          <ChameleonMascot size="sm" mood="happy" animate={false} />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">
                {welcomeName?.trim() ? `Hi, ${welcomeName}` : "Welcome back!"}
              </p>
              <p className="text-sm text-muted-foreground">
                {englishLevel?.trim() ? `Level ${englishLevel}` : "Exply"}
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-4">
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

        {!collapsed && showCategoryFilter ? (
          <div className="space-y-4 border-border border-t p-4">
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Category
              </p>
              <div className="flex flex-wrap gap-1">
                {sortedCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => onSelectCategory(category)}
                    className={cn(
                      "rounded px-2 py-1 text-xs font-medium transition-colors",
                      selectedCategory === category
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        <div className="border-border border-t p-4">
          <Link
            to="/profile"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-2",
            )}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>
      </aside>

      <nav className="fixed right-0 bottom-0 left-0 z-40 border-border border-t bg-card lg:hidden">
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
