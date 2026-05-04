import { Link, NavLink, Outlet } from "react-router";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Video,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  GraduationCap,
  BookOpen,
  FileQuestion,
  BarChart3,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { ChameleonMascot } from "../ChameleonMascot";
import {
  AdminButton,
  AdminInput,
} from "./adminUi";

const sidebarLinks = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/admin", end: true },
  { icon: Users, label: "Users", to: "/admin/users" },
  { icon: Video, label: "Videos", to: "/admin/videos" },
  { icon: FileQuestion, label: "Tests", to: "/admin/tests" },
  { icon: GraduationCap, label: "Teachers", to: "/admin/teachers" },
  { icon: BookOpen, label: "Topics", to: "/admin/topics" },
  { icon: BarChart3, label: "Analytics", to: "/admin/analytics" },
  { icon: Settings, label: "Settings", to: "/admin/settings" },
] as const;

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navCls = ({
    isActive,
    collapsedWidth,
  }: {
    isActive: boolean;
    collapsedWidth: boolean;
  }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
      isActive
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
      collapsedWidth && "justify-center px-2",
    );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 hidden flex-col border-border border-r bg-card transition-all duration-300 lg:flex",
          collapsed ? "w-20" : "w-64",
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center gap-3 border-border border-b p-4",
            collapsed && "justify-center",
          )}
        >
          <ChameleonMascot size="sm" mood="happy" animate={false} />
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-display text-xl font-bold">Exply</span>
              <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                Admin
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-20 -right-3 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-muted"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {sidebarLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={"end" in link ? link.end : false}
              className={({ isActive }) =>
                navCls({ isActive, collapsedWidth: collapsed })
              }
            >
              <link.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-border border-t p-4">
          <Link
            to="/"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              collapsed && "justify-center px-2",
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Exit admin</span>}
          </Link>
        </div>
      </aside>

      <div
        className={cn(
          "transition-[margin] duration-300 lg:ml-64",
          collapsed && "lg:ml-20",
        )}
      >
        <header className="sticky top-0 z-40 flex h-16 items-center border-border border-b bg-background/80 px-4 backdrop-blur-lg lg:px-6">
          <button
            type="button"
            className="mr-4 p-2 text-foreground lg:hidden"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>

          <div className="mr-4 flex items-center gap-2 lg:hidden">
            <ChameleonMascot size="sm" mood="happy" animate={false} />
            <span className="font-display font-bold">Exply</span>
          </div>

          <div className="hidden max-w-md flex-1 sm:block">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <AdminInput
                placeholder="Search users, videos, tests..."
                className="pl-9"
                aria-label="Admin search"
              />
            </div>
          </div>
          <div className="hidden flex-1 sm:block lg:hidden" />
          <div className="flex-1 sm:hidden" />

          <div className="flex items-center gap-2">
            <AdminButton variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
            </AdminButton>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                AD
              </div>
              <span className="hidden font-medium sm:inline text-sm">Admin</span>
            </div>
          </div>
        </header>

        {mobileMenuOpen ? (
          <div className="fixed inset-0 top-16 z-30 bg-background lg:hidden">
            <nav className="space-y-1 p-4">
              {sidebarLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={"end" in link ? link.end : false}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  <link.icon className="h-5 w-5" />
                  <span>{link.label}</span>
                </NavLink>
              ))}
              <div className="mt-4 border-border border-t pt-4">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Exit admin</span>
                </Link>
              </div>
            </nav>
          </div>
        ) : null}

        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
