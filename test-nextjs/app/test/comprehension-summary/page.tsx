"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import {
  readComprehensionSummaryFromSession,
  type ComprehensionSummaryPayload,
} from "@/lib/comprehension-summary-storage";
import { apiComprehensionSummaryRecommendations } from "@/lib/api";
import type {
  SubmitComprehensionTestResponse,
  SummaryRecommendationsResponse,
} from "@/lib/types";

type SummaryView =
  | { source: "session"; data: ComprehensionSummaryPayload }
  | { source: "url"; data: ComprehensionSummaryPayload };

function parseUrlSummary(search: URLSearchParams): ComprehensionSummaryPayload | null {
  const contentVideoId = Number.parseInt(search.get("contentVideoId") ?? "", 10);
  if (!Number.isFinite(contentVideoId) || contentVideoId < 1) return null;
  const videoName = search.get("videoName")?.trim() || "Video";
  const correct = Number.parseInt(search.get("correct") ?? "", 10);
  const total = Number.parseInt(search.get("total") ?? "", 10);
  const percentage = Number.parseFloat(search.get("percentage") ?? "");
  if (!Number.isFinite(correct) || !Number.isFinite(total) || !Number.isFinite(percentage)) {
    return null;
  }
  const cefrRaw = search.get("cefr");
  const cefrQ = cefrRaw?.trim() ? cefrRaw.trim() : null;
  let vocabularyTerms: string[] = [];
  const rawVt = search.get("vt");
  if (rawVt) {
    let parsedVt: unknown;
    try {
      parsedVt = JSON.parse(rawVt);
    } catch {
      try {
        parsedVt = JSON.parse(decodeURIComponent(rawVt));
      } catch {
        parsedVt = null;
      }
    }
    if (Array.isArray(parsedVt)) {
      vocabularyTerms = parsedVt.filter((x): x is string => typeof x === "string");
    }
  }
  const result: SubmitComprehensionTestResponse = {
    correct,
    total,
    percentage: Math.round(percentage * 10) / 10,
    comprehension: {
      correct: Number.parseInt(search.get("cc") ?? "0", 10) || 0,
      total: Number.parseInt(search.get("ct") ?? "0", 10) || 0,
    },
    grammar: {
      correct: Number.parseInt(search.get("gc") ?? "0", 10) || 0,
      total: Number.parseInt(search.get("gt") ?? "0", 10) || 0,
    },
    knowledgeTopicsUpdated: 0,
    knowledgeUpdates: [],
    message: search.get("msg")?.trim() ?? "",
    learnerCefr: cefrQ,
    vocabularyTerms,
  };
  const rawKu = search.get("ku");
  if (rawKu) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawKu);
    } catch {
      try {
        parsed = JSON.parse(decodeURIComponent(rawKu));
      } catch {
        parsed = null;
      }
    }
    if (parsed && Array.isArray(parsed)) {
      result.knowledgeUpdates = parsed
        .filter(
          (x): x is { topicId: number; previousScore: number; newScore: number } =>
            x != null &&
            typeof x === "object" &&
            "topicId" in x &&
            "previousScore" in x &&
            "newScore" in x,
        )
        .map((x) => ({
          topicId: Number(x.topicId),
          previousScore: Number(x.previousScore),
          newScore: Number(x.newScore),
        }));
      result.knowledgeTopicsUpdated = result.knowledgeUpdates.length;
    }
  }
  return {
    contentVideoId,
    videoName,
    learnerCefr: cefrQ,
    vocabularyTerms,
    result: { ...result, learnerCefr: cefrQ, vocabularyTerms },
  };
}

function ComprehensionSummaryContent() {
  const search = useSearchParams();
  const [view, setView] = useState<SummaryView | "empty" | undefined>(undefined);
  const [ai, setAi] = useState<SummaryRecommendationsResponse | null>(null);
  const [aiErr, setAiErr] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const fromUrl = parseUrlSummary(search);
    if (fromUrl) {
      setView({ source: "url", data: fromUrl });
      return;
    }
    const fromSession = readComprehensionSummaryFromSession();
    if (fromSession) {
      setView({ source: "session", data: fromSession });
      return;
    }
    setView("empty");
  }, [search]);

  useEffect(() => {
    if (view === undefined || view === "empty") {
      return;
    }
    const { contentVideoId, videoName, learnerCefr, vocabularyTerms, result } = view.data;
    let cancelled = false;
    setAiLoading(true);
    setAiErr(null);
    setAi(null);
    void apiComprehensionSummaryRecommendations(contentVideoId, {
      videoName,
      learnerCefr,
      vocabularyTerms,
      correct: result.correct,
      total: result.total,
      percentage: result.percentage,
      comprehension: result.comprehension,
      grammar: result.grammar,
    })
      .then((r) => {
        if (!cancelled) {
          setAi(r);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setAiErr(e instanceof Error ? e.message : "Could not load recommendations");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAiLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [view]);

  if (view === undefined) {
    return (
      <p className="text-zinc-500" aria-live="polite">
        Loading…
      </p>
    );
  }

  if (view === "empty") {
    return (
      <p className="text-zinc-500">
        No result to show. Return to a lesson, complete the test, and save your results, or
        use a full summary link.
      </p>
    );
  }

  const { contentVideoId, videoName, learnerCefr, vocabularyTerms, result } = view.data;
  const cefrLabel = learnerCefr || result.learnerCefr || "—";

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Lesson check — results
        </p>
        <h2 className="mt-1 text-2xl font-bold text-white">{videoName}</h2>
        <p className="mt-2 text-sm text-zinc-500">Content video #{contentVideoId}</p>
        <p className="mt-1 text-sm text-zinc-500">
          Level: <span className="text-zinc-300">{cefrLabel}</span>
        </p>

        <p className="mt-6 text-4xl font-extrabold text-emerald-400">
          {result.correct} / {result.total}{" "}
          <span className="text-2xl font-bold text-zinc-400">({result.percentage}%)</span>
        </p>
        <p className="mt-3 text-sm text-zinc-400">
          Comprehension: {result.comprehension.correct}/{result.comprehension.total} — Grammar:{" "}
          {result.grammar.correct}/{result.grammar.total}
        </p>
        {result.message ? (
          <p className="mt-4 text-sm text-zinc-200">{result.message}</p>
        ) : null}
        {result.knowledgeUpdates.length > 0 ? (
          <div className="mt-4">
            <p className="text-xs font-bold uppercase text-zinc-500">Topic knowledge</p>
            <ul className="mt-2 list-inside list-disc text-sm text-zinc-300">
              {result.knowledgeUpdates.map((k) => (
                <li key={k.topicId}>
                  Topic {k.topicId}: {k.previousScore} → {k.newScore}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {vocabularyTerms.length > 0 ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-950/20 p-6 sm:p-8">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-200/80">
            Words from your list used in this test
          </h3>
          <p className="mt-2 text-xs text-zinc-500">
            These are saved vocabulary items that helped shape the questions (and difficulty).
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {vocabularyTerms.map((w) => (
              <li
                key={w}
                className="rounded-full border border-amber-500/30 bg-zinc-900/80 px-3 py-1.5 text-sm text-amber-100"
              >
                {w}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <h3 className="text-sm font-bold uppercase text-zinc-500">Vocabulary</h3>
          <p className="mt-2 text-sm text-zinc-500">
            No saved words were linked to this session (sign in and add words, or take the test
            with your profile loaded) — recommendations below still use your scores.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-sky-500/25 bg-sky-950/20 p-6 sm:p-8">
        <h3 className="text-sm font-bold uppercase tracking-wider text-sky-200/90">
          AI coach (Gemini)
        </h3>
        {aiLoading ? (
          <p className="mt-4 text-sm text-zinc-500" aria-live="polite">
            Generating personalized recommendations…
          </p>
        ) : null}
        {aiErr ? (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {aiErr}
          </p>
        ) : null}
        {ai && !aiLoading ? (
          <div className="mt-4 space-y-4 text-sm">
            <p className="text-xl font-bold text-white">{ai.headline}</p>
            <p className="text-zinc-300 leading-relaxed">{ai.summary}</p>
            {ai.focusWords.length > 0 ? (
              <div>
                <p className="text-xs font-bold uppercase text-zinc-500">Focus words & phrases</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {ai.focusWords.map((w) => (
                    <li
                      key={w}
                      className="rounded-lg border border-sky-500/20 bg-zinc-900/80 px-2.5 py-1 text-sky-100"
                    >
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {ai.nextSteps.length > 0 ? (
              <div>
                <p className="text-xs font-bold uppercase text-zinc-500">Next steps</p>
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-zinc-300">
                  {ai.nextSteps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            ) : null}
            <p className="text-zinc-500 italic border-t border-zinc-800 pt-4">{ai.encouragement}</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/content/${contentVideoId}`}
          className="inline-flex rounded-full bg-sky-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-sky-500"
        >
          Back to lesson
        </Link>
        <Link
          href="/video-page"
          className="inline-flex rounded-full border border-zinc-600 px-5 py-2.5 text-sm font-bold text-zinc-200 hover:bg-zinc-800"
        >
          Video library
        </Link>
      </div>
    </div>
  );
}

export default function ComprehensionSummaryPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-8 text-3xl font-extrabold tracking-tight">Test summary</h1>
        <Suspense
          fallback={
            <p className="text-zinc-500" aria-live="polite">
              Loading…
            </p>
          }
        >
          <ComprehensionSummaryContent />
        </Suspense>
      </main>
    </div>
  );
}
