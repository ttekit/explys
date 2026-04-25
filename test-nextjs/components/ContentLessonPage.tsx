"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { apiFetch, apiGetComprehensionTests } from "@/lib/api";
import { getSession } from "@/lib/session";
import type { ContentVideo, GenerateComprehensionTestsResponse } from "@/lib/types";
import { Navigation } from "./Navigation";
import ProgressbarContent from "./ProgressbarContent";
import TestLabel from "./TestLabel";
import VideoPlayer from "./VideoPlayer";
import TestsArea from "./TestsArea";
function LoadingView() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-4">
        <div
          className="h-14 w-14 animate-spin rounded-full border-4 border-zinc-800 border-t-blue-500"
          aria-hidden
        />
        <p className="text-sm font-medium text-zinc-400">Loading video…</p>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  cta,
}: {
  title: string;
  description: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <main className="mx-auto max-w-lg px-4 py-20 text-center sm:px-6">
        <div className="rounded-[2rem] border-2 border-dashed border-zinc-800/80 bg-zinc-900/30 px-8 py-14">
          <div className="mb-4 text-4xl" aria-hidden>
            🎬
          </div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            {description}
          </p>
          <Link
            href={cta.href}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            {cta.label}
          </Link>
        </div>
      </main>
    </div>
  );
}

type VideoData = {
  videoName: string;
  videoLink: string;
  content: { category: { name: string } };
};

export function ContentNoIdPage() {
  return (
    <EmptyState
      title="No video selected"
      description="Open the library and pick a lesson, or return from a video link with an ID in the URL."
      cta={{ href: "/video-page", label: "Browse video library" }}
    />
  );
}

type TestsLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: GenerateComprehensionTestsResponse }
  | { status: "error"; message: string };

export function ContentLessonPage() {
  const params = useParams();
  const raw = params?.id;
  const id = raw ? String(Array.isArray(raw) ? raw[0] : raw) : "";
  const [filmView, setFilmView] = useState(true);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [testsState, setTestsState] = useState<TestsLoadState>({ status: "idle" });
  const [quizComplete, setQuizComplete] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const fetchVideo = async () => {
      try {
        setLoading(true);
        const response = await apiFetch(`/content-video/${id}`, {
          method: "GET",
        });
        if (response.ok) {
          const data = (await response.json()) as ContentVideo;
          const name =
            data.content?.category?.name ??
            data.content?.name ??
            "Video";
          setVideoData({
            videoName: data.videoName,
            videoLink: data.videoLink,
            content: { category: { name } },
          });
        } else {
          setVideoData(null);
        }
      } catch (e) {
        console.error("Error loading video:", e);
        setVideoData(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchVideo();
  }, [id]);

  useEffect(() => {
    if (!id || !videoData) {
      return;
    }
    const contentVideoId = Number.parseInt(id, 10);
    if (!Number.isFinite(contentVideoId)) {
      return;
    }
    const session = getSession();
    const userId = session?.user?.id ?? null;
    let cancelled = false;
    setTestsState({ status: "loading" });
    void (async () => {
      try {
        const data = await apiGetComprehensionTests(contentVideoId, userId);
        if (!cancelled) {
          setTestsState({ status: "ok", data });
        }
      } catch (e) {
        if (!cancelled) {
          setTestsState({
            status: "error",
            message:
              e instanceof Error ? e.message : "Could not load comprehension tests",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, videoData]);

  const handleToTestsVideo = () => {
    setFilmView((v) => !v);
  };

  if (loading) {
    return <LoadingView />;
  }

  if (!videoData) {
    return (
      <EmptyState
        title="Video not found"
        description="This clip may have been removed or the link is wrong."
        cta={{ href: "/video-page", label: "Back to library" }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />

      <main className="mx-auto max-w-5xl space-y-6 px-4 pb-12 pt-4 sm:px-6 sm:pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-lg">
              <img
                src="/mainIcon.svg"
                alt=""
                className="h-7 w-7"
                width={28}
                height={28}
              />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-blue-400/90">
                {videoData.content.category.name}
              </p>
              <h1 className="mt-0.5 truncate text-xl font-bold text-white sm:text-2xl">
                {videoData.videoName}
              </h1>
            </div>
          </div>

          <Link
            href="/video-page"
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full border border-zinc-700 bg-zinc-900/60 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:border-blue-500/50 hover:text-white"
          >
            <img
              className="h-5 w-5 opacity-90"
              src="/backButton.svg"
              alt=""
            />
            <span>Library</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-6 lg:col-span-2">
            {filmView ? (
              <div>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-base font-bold text-white sm:text-lg">
                    {videoData.videoName}
                  </p>
                  <button
                    type="button"
                    onClick={handleToTestsVideo}
                    className="w-full rounded-full bg-violet-600 px-4 py-2.5 text-center text-xs font-bold text-white shadow-lg shadow-violet-900/30 transition hover:bg-violet-500 sm:w-auto"
                  >
                    Continue to tests
                  </button>
                </div>
                <VideoPlayer src={videoData.videoLink} />
              </div>
            ) : (
              <div>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-base font-bold text-white sm:text-lg">
                    Tests
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleToTestsVideo}
                      className="rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white shadow-md transition hover:bg-violet-500"
                    >
                      Return to video
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-zinc-600 bg-zinc-800/80 px-4 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-700"
                    >
                      Next test
                    </button>
                  </div>
                </div>
                {testsState.status === "loading" || testsState.status === "idle" ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <div
                      className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-800 border-t-violet-500"
                      aria-hidden
                    />
                    <p className="text-sm text-zinc-500">Loading tests…</p>
                  </div>
                ) : testsState.status === "error" ? (
                  <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-sm text-red-300">
                    <p className="font-semibold">Tests could not be loaded</p>
                    <p className="mt-1 text-red-400/90">{testsState.message}</p>
                    <button
                      type="button"
                      onClick={() => {
                        const contentVideoId = Number.parseInt(id, 10);
                        const session = getSession();
                        setTestsState({ status: "loading" });
                        void apiGetComprehensionTests(
                          contentVideoId,
                          session?.user?.id ?? null,
                        )
                          .then((data) => setTestsState({ status: "ok", data }))
                          .catch((e) =>
                            setTestsState({
                              status: "error",
                              message:
                                e instanceof Error
                                  ? e.message
                                  : "Could not load comprehension tests",
                            }),
                          );
                      }}
                      className="mt-3 rounded-full bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-700"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <TestsArea
                    contentVideoId={Number.parseInt(id, 10)}
                    data={testsState.data}
                    onSubmitted={() => setQuizComplete(true)}
                  />
                )}
              </div>
            )}
          </div>

          <aside className="flex flex-col rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-5">
            <p className="mb-3 text-sm font-bold text-zinc-200">Tests</p>
            <div className="flex flex-1 flex-col gap-1">
              <TestLabel isDone={quizComplete}>
                Lesson quiz
                {testsState.status === "ok"
                  ? ` (${testsState.data.tests.length} questions)`
                  : ""}
              </TestLabel>
              <TestLabel isDone={false}>Summary</TestLabel>
            </div>
          </aside>
        </div>

        <section className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-6">
          <p className="mb-3 text-sm font-bold text-zinc-200">Progress</p>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-2">
            <ProgressbarContent isDone>Video</ProgressbarContent>
            <ProgressbarContent isDone={quizComplete}>Tests</ProgressbarContent>
            <ProgressbarContent isDone={false}>Summary</ProgressbarContent>
          </div>
        </section>
      </main>
    </div>
  );
}
