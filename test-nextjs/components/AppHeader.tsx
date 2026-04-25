"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getSession, clearSession } from "@/lib/session";
import { useEffect, useState } from "react";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    setEmail(getSession()?.user?.email ?? null);
  }, [pathname]);

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-12 max-w-4xl items-center justify-between gap-3 px-4 text-sm">
        <nav className="flex flex-wrap items-center gap-3">
          <Link
            className="font-semibold text-zinc-900 dark:text-zinc-100"
            href="/"
          >
            Eng Curses (API test)
          </Link>
          <Link
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            href="/login"
          >
            Log in
          </Link>
          <Link
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            href="/register"
          >
            Register
          </Link>
          <Link
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            href="/dashboard"
          >
            Dashboard
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {email ? (
            <>
              <span
                className="hidden max-w-[12rem] truncate text-zinc-500 sm:inline"
                title={email}
              >
                {email}
              </span>
              <button
                type="button"
                onClick={() => {
                  clearSession();
                  setEmail(null);
                  router.push("/");
                }}
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Sign out
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
