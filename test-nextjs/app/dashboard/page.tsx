"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  apiGetUser,
  apiListUsers,
  apiPlacementStatus,
  getApiBase,
  placementTestIframeSrc,
} from "@/lib/api";
import { getSession } from "@/lib/session";
import type { PlacementStatus, UserProfile } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[] | null>(null);
  const [placement, setPlacement] = useState<PlacementStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const load = useCallback(() => {
    const s = getSession();
    if (!s) {
      router.replace("/login?next=/dashboard");
      return;
    }
    setToken(s.access_token);
    setErr(null);
    setLoading(true);
    Promise.all([
      apiGetUser(s.user.id, s.access_token),
      apiListUsers(s.access_token).catch(
        (e) => (console.warn("GET /users", e), [] as UserProfile[]),
      ),
      apiPlacementStatus(s.access_token),
    ])
      .then(([u, list, p]) => {
        setMe(u);
        setAllUsers(list);
        setPlacement(p);
      })
      .catch((e) => {
        setErr(e instanceof Error ? e.message : "Failed to load");
        setMe(null);
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onMsg(ev: MessageEvent) {
      if (ev.data?.type === "placement_test_complete") {
        load();
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [load]);

  if (loading && !me) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 text-sm text-zinc-500">
        Loading…
      </main>
    );
  }

  if (err && !me) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="whitespace-pre-wrap text-red-600 dark:text-red-400">
          {err}
        </p>
        <Link
          className="mt-4 inline-block text-sm underline"
          href="/login"
        >
          Back to log in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Dashboard
      </h1>
      <p className="text-sm text-zinc-500">
        API: <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">{getApiBase()}</code>
      </p>

      {me ? (
        <section className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Your account (GET /users/{me.id})
          </h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Name</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {me.name}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Email</dt>
              <dd>{me.email}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">hasCompletedPlacement</dt>
              <dd>
                {String(me.hasCompletedPlacement ?? "—")}{" "}
                {me.hasCompletedPlacement ? (
                  <span className="text-green-600">done</span>
                ) : (
                  <span className="text-amber-600">entry test may apply</span>
                )}
              </dd>
            </div>
            {me.createdAt ? (
              <div>
                <dt className="text-zinc-500">createdAt</dt>
                <dd>{me.createdAt}</dd>
              </div>
            ) : null}
          </dl>
          {me.additionalUserData ? (
            <div className="mt-4 rounded border border-zinc-200 bg-white/60 p-3 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-200">
              <p className="mb-1 font-medium text-zinc-500">additionalUserData</p>
              <pre className="whitespace-pre-wrap break-words font-mono">
                {JSON.stringify(me.additionalUserData, null, 2)}
              </pre>
            </div>
          ) : null}
        </section>
      ) : null}

      {placement ? (
        <section className="mt-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Placement (GET /placement-test/status)
          </h2>
          <p className="mt-2 text-sm">
            shouldShowEntryTest:{" "}
            <strong>
              {placement.shouldShowEntryTest ? "true" : "false"}
            </strong>{" "}
            · hasCompletedPlacement:{" "}
            <strong>
              {placement.hasCompletedPlacement ? "true" : "false"}
            </strong>
          </p>
          {token && placement.shouldShowEntryTest ? (
            <div className="mt-4">
              <p className="text-xs text-zinc-500">iframe → placement-test/document</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIframeKey((k) => k + 1)}
                  className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
                >
                  Reload test iframe
                </button>
                <button
                  type="button"
                  onClick={load}
                  className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-600"
                >
                  Refresh data
                </button>
              </div>
              <iframe
                key={iframeKey}
                className="mt-3 w-full min-h-[520px] rounded-md border border-zinc-300 dark:border-zinc-700"
                title="Entrance / placement test"
                src={placementTestIframeSrc(token)}
                sandbox="allow-scripts allow-forms allow-same-origin"
              />
            </div>
          ) : (
            <p className="mt-2 text-sm text-zinc-500">
              {placement.hasCompletedPlacement
                ? "Placement already completed; iframe hidden."
                : "Sign in to load the entry test (token required for iframe)."}
            </p>
          )}
        </section>
      ) : null}

      {allUsers && allUsers.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Directory (GET /users)
          </h2>
          <ul className="mt-2 divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {allUsers.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="font-mono text-zinc-500">#{u.id}</span>
                <span className="flex-1 text-zinc-900 dark:text-zinc-100">
                  {u.name}
                </span>
                <span className="max-w-[12rem] truncate text-zinc-500 sm:max-w-md">
                  {u.email}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : allUsers && allUsers.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No users returned from GET /users.</p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-2 text-sm">
        <button
          type="button"
          onClick={load}
          className="rounded-md bg-zinc-200 px-3 py-1.5 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        >
          Refresh all
        </button>
        <a
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300"
          href={getApiBase() + "/api"}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open API Swagger
        </a>
        <a
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300"
          href={getApiBase() + "/dev/entrance-test.html"}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open backend dev HTML
        </a>
      </div>
    </main>
  );
}
