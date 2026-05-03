"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  clearSession,
  getSession,
  SESSION_CHANGE_EVENT,
} from "@/lib/session";
import type { AuthSession } from "@/lib/types";

const navBtn =
  "inline-flex items-center justify-center rounded-full font-bold text-sm px-5 py-2.5 transition-colors";

export function Navigation() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const sync = () => setSession(getSession());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(SESSION_CHANGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(SESSION_CHANGE_EVENT, sync);
    };
  }, []);

  const isLoggedIn = session != null;

  function handleExit() {
    clearSession();
    router.push("/login");
  }

  return (
    <nav className="w-full bg-black border-b border-zinc-800 p-4 flex flex-col items-center">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        <Link
          href="/video-page"
          className="text-white font-bold text-2xl tracking-tighter"
        >
          Cine<span className="text-blue-500">Lingo</span>
        </Link>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-4">
            <select
              className="bg-zinc-950 text-white border border-zinc-800 font-bold rounded-md px-3 py-1 text-sm outline-none focus:border-blue-500"
              aria-label="Genres"
            >
              <option>Genres</option>
              <option>All Genres</option>
              <option>Comedy</option>
              <option>Drama</option>
              <option>Sci-Fi</option>
              <option>Thriller</option>
            </select>

            <select
              className="bg-zinc-950 text-white border border-zinc-800 font-bold rounded-md px-3 py-1 text-sm outline-none focus:border-blue-500"
              aria-label="Language"
            >
              <option>Language</option>
              <option>English</option>
              <option>Ukrainian</option>
              <option>German</option>
              <option>French</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            {isLoggedIn ? (
              <>
                <button
                  type="button"
                  onClick={handleExit}
                  className={`${navBtn} border border-zinc-600 text-zinc-200 bg-transparent hover:bg-zinc-800 hover:text-white`}
                >
                  Exit
                </button>
                <Link
                  href="/profile"
                  className={`${navBtn} bg-blue-500 text-white hover:bg-blue-600 border border-transparent`}
                >
                  Profile
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`${navBtn} border border-white text-white bg-transparent hover:bg-white hover:text-black`}
                >
                  Login
                </Link>

                <Link
                  href="/register"
                  className={`${navBtn} bg-blue-500 text-white hover:bg-blue-600 border border-transparent`}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
