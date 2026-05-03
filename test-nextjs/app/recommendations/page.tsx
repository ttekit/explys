"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiGetContentRecommendations } from "@/lib/api";
import type { ContentRecommendationsResponse } from "@/lib/types";
import { getSession } from "@/lib/session";
import { Navigation } from "@/components/Navigation";

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default function RecommendationsPage() {
  const [data, setData] = useState<ContentRecommendationsResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  const load = useCallback(async (uid: number) => {
    setErr(null);
    setLoading(true);
    try {
      setData(await apiGetContentRecommendations(uid));
    } catch (e) {
      setData(null);
      setErr(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const s = getSession();
    if (s?.user?.id) {
      setUserId(s.user.id);
      void load(s.user.id);
    }
  }, [load]);

  if (userId == null) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Navigation />
        <main className="mx-auto max-w-3xl flex-1 px-4 py-10">
          <h1 className="text-2xl font-semibold">Content for you</h1>
          <p className="mt-3 text-sm text-zinc-400">
            <Link className="text-blue-400 underline" href="/login">
              Log in
            </Link>{" "}
            first. Recommendations use your CEFR, topic knowledge, interests, and
            each video&apos;s difficulty and tags from the API.
          </p>
          <p className="mt-4 text-sm text-zinc-500">
            <Link className="underline" href="/video-page">
              Video library
            </Link>
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <Navigation />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold">Content for you</h1>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              if (userId) void load(userId);
            }}
            className="rounded-md border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
        <p className="mt-2 text-sm text-zinc-400">
          <code className="text-xs text-zinc-500">GET /content-recommendations/for-user/:userId</code>
        </p>

        {err ? <p className="mt-4 text-sm text-red-400">{err}</p> : null}

        {data ? (
          <div className="mt-6 space-y-6">
            <section className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Your model input
              </h2>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-zinc-500">CEFR (from profile)</dt>
                  <dd className="font-mono">
                    {data.user.cefrSource ?? "—"}{" "}
                    <span className="text-zinc-500">
                      (unit {data.user.cefrUnit.toFixed(2)})
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Vocabulary / topic knowledge</dt>
                  <dd className="font-mono">
                    {pct(data.user.vocabularyStrength)} (from {data.user.topicRows}{" "}
                    topic row{data.user.topicRows === 1 ? "" : "s"})
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Target processing load</dt>
                  <dd className="font-mono">
                    {data.user.targetProcessingComplexity.toFixed(1)} / 10
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-zinc-500">
                    Theme tokens (hobbies, interests, topics, …)
                  </dt>
                  <dd>
                    {data.user.themeTokenSample.length > 0
                      ? data.user.themeTokenSample.join(", ")
                      : "— (add hobbies / interests / run topic analysis)"}
                  </dd>
                </div>
              </dl>
            </section>

            <section>
              <h2 className="text-sm font-medium">Best videos to watch</h2>
              <ol className="mt-3 space-y-3">
                {data.recommendations.map(
                  (r: ContentRecommendationsResponse["recommendations"][number]) => (
                    <li
                      key={r.contentVideo.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-zinc-500">
                            #{r.rank} — {r.content.name}
                          </p>
                          <h3 className="font-medium">{r.contentVideo.videoName}</h3>
                          {r.contentVideo.videoDescription ? (
                            <p className="mt-1 text-sm text-zinc-400 line-clamp-2">
                              {r.contentVideo.videoDescription}
                            </p>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold tabular-nums text-violet-300">
                            {pct(r.score)}
                          </p>
                          <p className="text-xs text-zinc-500">fit score</p>
                        </div>
                      </div>
                      <a
                        className="mt-2 inline-block text-sm text-blue-400 underline"
                        href={r.contentVideo.videoLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open video
                      </a>
                    </li>
                  ),
                )}
              </ol>
              {data.recommendations.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-500">
                  No videos in the catalog yet.
                </p>
              ) : null}
            </section>
          </div>
        ) : !err && loading ? (
          <p className="mt-6 text-sm text-zinc-500">Loading…</p>
        ) : null}

        <p className="mt-8 text-sm text-zinc-500">
          <Link className="underline" href="/video-page">
            Video library
          </Link>
        </p>
      </main>
    </div>
  );
}
