import { Link, useLocation, useSearchParams } from "react-router";
import { cn } from "../../lib/utils";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Search,
  Settings,
  SlidersHorizontal,
  Trophy,
  User,
  GraduationCap,
  Shield,
  BellRing,
  Sun,
  Moon,
} from "lucide-react";
import { useUser } from "../../context/UserContext";
import type { UserData } from "../../context/UserContext";
import { useAppMessages } from "../../hooks/useAppMessages";
import { formatMessage } from "../../lib/formatMessage";
import { LearnerCustomiseFab } from "./LearnerCustomiseFab";
import { useTheme } from "../../context/ThemeContext";
import { useEffect, useState } from "react";
import { getCachedChangelogs } from "../../lib/changelogsCache";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { ThemeToggle } from "../ThemeToggle";

const sidebarLinkDefs = [
  { id: "catalog" as const, icon: LayoutGrid, to: "/catalog" },
  { id: "search" as const, icon: Search, to: "/catalog" },
  { id: "classroom" as const, icon: GraduationCap, to: "/classroom" },
  { id: "myLessons" as const, icon: BookOpen, to: "/watched-lessons" },
  { id: "customise" as const, icon: SlidersHorizontal, to: "/customise" },
  { id: "changelog" as const, icon: BellRing, to: "/whats-new" },
  { id: "leaderboard" as const, icon: Trophy, to: "/leaderboard" },
  { id: "profile" as const, icon: User, to: "/profile" },
  {
    id: "admin" as const,
    icon: Shield,
    to: "https://explys.com/admin",
    isExternal: true,
  },
] as const;

type SidebarLinkId = (typeof sidebarLinkDefs)[number]["id"];

function shouldShowClassroomNav(user: UserData | null | undefined): boolean {
  if (!user) {
    return false;
  }
  const role = user.role?.toLowerCase();
  if (role === "admin") {
    return false;
  }

  if (role === "teacher") {
    return true;
  }
  return user.teacherId != null && user.teacherId > 0;
}

function resolveVisibleSidebarLinks(user: UserData | null | undefined) {
  return sidebarLinkDefs.filter((link) => {
    if (link.id === "customise") {
      return false;
    }
    if (link.id === "classroom") {
      return shouldShowClassroomNav(user);
    }
    if (link.id === "admin") {
      return user?.role?.toLowerCase() === "admin";
    }
    return true;
  });
}

const LEVELS = ["All", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

function resolve_sidebar_top_class(reserveTopNavSpace: boolean): string {
  if (reserveTopNavSpace) {
    return "top-[calc(var(--email-verification-banner-height,0px)+4.5rem)]";
  }
  return "top-[var(--email-verification-banner-height,0px)]";
}

interface CatalogSidebarProps {
  selectedLevel?: string;
  onSelectLevel?: (level: string) => void;
  genres?: string[];
  selectedGenre?: string;
  onSelectGenre?: (genre: string) => void;
  reserveTopNavSpace?: boolean;
  catalogSpotlightOpen?: boolean;
  onOpenCatalogSpotlight?: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function CatalogSidebar({
  selectedLevel = "All",
  onSelectLevel,
  genres = [],
  selectedGenre = "All",
  onSelectGenre,
  reserveTopNavSpace = true,
  catalogSpotlightOpen = false,
  onOpenCatalogSpotlight,
  collapsed,
  onCollapsedChange,
}: CatalogSidebarProps) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const shell = useAppMessages().catalogShell;
  const common = useAppMessages().common;
  const [unreadCount, setUnreadCount] = useState(0);

  const { theme, setTheme } = useTheme();
  const { locale, setLocale } = useLandingLocale();

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const logs = await getCachedChangelogs();
        if (logs && logs.length > 0) {
          const lastSeenId =
            Number(localStorage.getItem("lastSeenChangelogId")) || 0;
          const unread = logs.filter((log: any) => log.id > lastSeenId).length;
          setUnreadCount(unread);
        }
      } catch (error) {
        console.error("Sidebar changelogs error:", error);
      }
    };

    fetchUnread();

    const handleLogsRead = () => setUnreadCount(0);
    window.addEventListener("changelogs-read", handleLogsRead);

    return () => window.removeEventListener("changelogs-read", handleLogsRead);
  }, []);

  const sidebarLabels: Record<SidebarLinkId, string> = {
    catalog: shell.navCatalog,
    search: shell.navSearch,
    classroom: shell.navClassroom,
    myLessons: shell.navMyLessons,
    changelog: shell.news,
    customise: shell.navCustomise,
    leaderboard: shell.navLeaderboard,
    profile: shell.navProfile,
    admin: shell.navAdmin,
  };
  const welcomeName = user?.name;
  const avatarUrl = user?.avatarUrl;
  const englishLevel = user?.englishLevel;

  const sortedGenres = ["All", ...genres.filter(Boolean).sort()];

  const linkActive = (linkId: SidebarLinkId) => {
    if (linkId === "admin") return false;
    if (linkId === "catalog") {
      return pathname === "/catalog" && !catalogSpotlightOpen;
    }
    if (linkId === "search") {
      return pathname === "/catalog" && catalogSpotlightOpen;
    }
    const tab = searchParams.get("tab");
    if (linkId === "leaderboard") {
      return pathname === "/leaderboard";
    }
    if (linkId === "profile") {
      return pathname === "/profile" && tab !== "settings";
    }
    if (linkId === "customise") {
      return pathname === "/customise";
    }
    if (linkId === "changelog") {
      return pathname === "/whats-new";
    }

    const link = sidebarLinkDefs.find((l) => l.id === linkId);
    return link ? pathname === link.to.split("?")[0] : false;
  };

  const filterLabel = (value: string): string => {
    if (value === "All") return common.filterAll;
    return value;
  };

  const sidebarTopClass = resolve_sidebar_top_class(reserveTopNavSpace);
  const visibleSidebarLinks = resolveVisibleSidebarLinks(user);

  return (
    <>
      <aside
        className={cn(
          "fixed bottom-0 left-0 z-50 hidden flex-col border-r border-border bg-card font-display transition-all duration-300 lg:flex",
          sidebarTopClass,
          collapsed ? "w-20" : "w-64 shadow-2xl",
        )}
      >
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className="z-50 absolute top-6 hover:cursor-pointer -right-3 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted"
          aria-label={collapsed ? common.expandSidebar : common.collapseSidebar}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>

        <div className="mx-3 my-3 flex h-28 shrink-0 flex-col justify-between overflow-hidden rounded-[24px] border border-border bg-card p-2.5 transition-all duration-300">
          <div
            className={cn(
              "flex h-10 w-full items-center transition-all duration-300",
              collapsed ? "justify-center" : "justify-start",
            )}
          >
            <Link
              to="/profile"
              className="flex h-10 w-10 shrink-0 items-center justify-center"
            >
              <img
                src={avatarUrl || `${import.meta.env.BASE_URL}LandingProfile.svg`}
                className="h-9 w-9 rounded-full object-cover"
                alt=""
              />
            </Link>

            <div
              className={cn(
                "flex flex-col justify-center min-w-0 overflow-hidden transition-all duration-300",
                collapsed ? "w-0 opacity-0" : "flex-1 opacity-100 pl-2.5",
              )}
            >
              <p className="truncate text-[13px] text-foreground/70 leading-tight">
                {welcomeName?.trim()
                  ? formatMessage(shell.greetingHi, { name: welcomeName })
                  : shell.welcomeBackExclaim}
              </p>
              <p className="truncate text-[13px] font-semibold text-accent leading-tight mt-0.5">
                {englishLevel?.trim()
                  ? formatMessage(shell.levelWithDot, {
                      prefix: common.levelPrefix,
                      level: englishLevel,
                    })
                  : shell.brandsFallback}
              </p>
            </div>
          </div>

          <div className="flex h-2 w-full items-center justify-center">
            <div
              className={cn(
                "h-px bg-border/60 transition-all duration-300",
                collapsed ? "w-8" : "w-full mx-2",
              )}
            />
          </div>

          <div className="flex h-10 w-full items-center justify-center gap-2.5">
            {!collapsed ? (
              <>
                <div className="flex h-9 items-center rounded-full border border-border p-0.5 shrink-0 bg-card">
                  <button
                    type="button"
                    className={cn(
                      "flex h-full items-center justify-center rounded-full px-4 text-xs font-bold transition-colors hover:cursor-pointer",
                      locale === "uk"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    onClick={() => setLocale("uk")}
                  >
                    UA
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex h-full items-center justify-center rounded-full px-4 text-xs font-bold transition-colors hover:cursor-pointer",
                      locale === "en"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    onClick={() => setLocale("en")}
                  >
                    EN
                  </button>
                </div>

                <div className="flex h-9 items-center rounded-full border border-border p-0.5 shrink-0 bg-card">
                  <button
                    type="button"
                    className={cn(
                      "flex h-full items-center justify-center rounded-full px-3.5 transition-colors hover:cursor-pointer",
                      theme === "light"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    onClick={() => setTheme && setTheme("light")}
                  >
                    <Sun className="h-[18px] w-[18px]" />
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex h-full items-center justify-center rounded-full px-3.5 transition-colors hover:cursor-pointer",
                      theme === "dark"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                    onClick={() => setTheme && setTheme("dark")}
                  >
                    <Moon className="h-[18px] w-[18px]" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center scale-90">
                <ThemeToggle />
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto space-y-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <nav className="flex-col space-y-1 p-4">
            {visibleSidebarLinks
              .filter((link) => link.id !== "changelog")
              .map((link) => {
                const active = linkActive(link.id);

                const itemClass = cn(
                  "relative flex items-center h-10 w-full rounded-lg transition-all duration-300",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                );

                const linkContent = (
                  <>
                    <div className="flex h-full w-12 shrink-0 items-center justify-center">
                      <link.icon className="h-5 w-5" />
                    </div>

                    <div
                      className={cn(
                        "flex min-w-0 items-center overflow-hidden transition-all duration-300",
                        collapsed ? "w-0 opacity-0" : "flex-1 opacity-100 pr-4",
                      )}
                    >
                      <span className="truncate whitespace-nowrap">
                        {sidebarLabels[link.id]}
                      </span>
                    </div>
                  </>
                );

                if ("isExternal" in link && link.isExternal) {
                  return (
                    <a key={link.id} href={link.to} className={itemClass}>
                      {linkContent}
                    </a>
                  );
                }

                if (link.id === "search") {
                  return pathname === "/catalog" && onOpenCatalogSpotlight ? (
                    <button
                      key={link.id}
                      type="button"
                      className={itemClass}
                      onClick={() => onOpenCatalogSpotlight()}
                    >
                      {linkContent}
                    </button>
                  ) : (
                    <Link
                      key={link.id}
                      to="/catalog"
                      state={{ openSpotlight: true }}
                      className={itemClass}
                    >
                      {linkContent}
                    </Link>
                  );
                }

                return (
                  <Link key={link.id} to={link.to} className={itemClass}>
                    {linkContent}
                  </Link>
                );
              })}
          </nav>
          {!collapsed && (
            <div className="space-y-4 border-t border-border p-4">
              <p className="mb-2 text-sm font-medium text-foreground">
                {shell.sectionLevel}
              </p>
              <div className="flex flex-wrap gap-1">
                {LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => onSelectLevel?.(level)}
                    className={cn(
                      "rounded px-2 py-1 text-xs font-medium transition-colors hover:cursor-pointer",
                      selectedLevel === level
                        ? "bg-primary text-primary-foreground shadow-inner"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {filterLabel(level)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!collapsed && genres.length > 0 && (
            <div className="space-y-4 border-t border-border p-4">
              <p className="mb-2 text-sm font-medium text-foreground">
                {shell.sectionGenre}
              </p>
              <div className="flex flex-wrap gap-1">
                {sortedGenres.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => onSelectGenre?.(genre)}
                    className={cn(
                      "rounded px-2 py-1 text-xs font-medium transition-colors hover:cursor-pointer",
                      selectedGenre === genre
                        ? "bg-accent text-accent-foreground shadow-inner"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {filterLabel(genre)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-1 border-t border-border p-4 shrink-0 bg-card">
          <Link
            to="/whats-new"
            className={cn(
              "relative flex items-center h-10 w-full rounded-lg transition-all duration-300",
              linkActive("changelog")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <div className="flex h-full w-12 shrink-0 items-center justify-center">
              <div className="relative flex h-5 w-5 items-center justify-center">
                <BellRing className="h-5 w-5" />
                {collapsed && unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-[1.5px] border-card bg-red-500"></span>
                  </span>
                )}
              </div>
            </div>

            <div
              className={cn(
                "flex min-w-0 items-center overflow-hidden transition-all duration-300",
                collapsed ? "w-0 opacity-0" : "flex-1 opacity-100 pr-4",
              )}
            >
              <span className="truncate whitespace-nowrap">
                {sidebarLabels["changelog"]}
              </span>
              {!collapsed && unreadCount > 0 && (
                <span className="ml-auto flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white shadow-sm">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
          </Link>

          <Link
            to="/profile?tab=settings"
            className={cn(
              "relative flex items-center h-10 w-full rounded-lg transition-all duration-300",
              pathname === "/profile" && searchParams.get("tab") === "settings"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <div className="flex h-full w-12 shrink-0 items-center justify-center">
              <Settings className="h-5 w-5 shrink-0" />
            </div>

            <div
              className={cn(
                "flex min-w-0 items-center overflow-hidden transition-all duration-300",
                collapsed ? "w-0 opacity-0" : "flex-1 opacity-100 pr-4",
              )}
            >
              <span className="truncate whitespace-nowrap">
                {shell.settings}
              </span>
            </div>
          </Link>
        </div>
      </aside>

      {!collapsed && (
        <div
          className={cn(
            "fixed right-0 bottom-0 left-0 z-40 hidden bg-black/40 backdrop-blur-[3px] lg:block",
            sidebarTopClass,
          )}
          onClick={() => onCollapsedChange(true)}
        />
      )}

      <nav className="fixed right-0 bottom-0 left-0 z-40 border-t border-border bg-card lg:hidden pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="flex w-full items-start justify-evenly px-1 pt-2 pb-1">
          {visibleSidebarLinks.map((link) => {
            const active = linkActive(link.id);

            const itemClass = cn(
              "flex flex-col flex-1 min-w-0 items-center justify-start gap-1.5 rounded-lg px-0.5 py-1 transition-colors hover:cursor-pointer",
              active ? "text-primary" : "text-muted-foreground",
            );

            const textClass =
              "w-full truncate text-center text-[10px] font-medium tracking-tight";

            if ("isExternal" in link && link.isExternal) {
              return (
                <a key={link.id} href={link.to} className={itemClass}>
                  <link.icon className="h-5 w-5 shrink-0" />
                  <span className={textClass}>{sidebarLabels[link.id]}</span>
                </a>
              );
            }

            if (link.id === "search") {
              return pathname === "/catalog" && onOpenCatalogSpotlight ? (
                <button
                  key={link.id}
                  type="button"
                  className={itemClass}
                  onClick={() => onOpenCatalogSpotlight()}
                >
                  <link.icon className="h-5 w-5 shrink-0" />
                  <span className={textClass}>{sidebarLabels[link.id]}</span>
                </button>
              ) : (
                <Link
                  key={link.id}
                  to="/catalog"
                  state={{ openSpotlight: true }}
                  className={itemClass}
                >
                  <link.icon className="h-5 w-5 shrink-0" />
                  <span className={textClass}>{sidebarLabels[link.id]}</span>
                </Link>
              );
            }

            return (
              <Link key={link.id} to={link.to} className={itemClass}>
                <div className="relative">
                  <link.icon className="h-5 w-5 shrink-0" />

                  {link.id === "changelog" && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-card"></span>
                    </span>
                  )}
                </div>
                <span className={textClass}>{sidebarLabels[link.id]}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <LearnerCustomiseFab />
    </>
  );
}
