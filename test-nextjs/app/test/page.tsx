"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  apiFetch,
  apiGenerateComprehensionTests,
  apiGenerateContentVideoTags,
  apiGetContentVideo,
  apiGetContentVideoIframe,
  apiPostContentVideoWatchComplete,
  comprehensionTestsIframeUrl,
  getApiBase,
} from "@/lib/api";
import type {
  ContentVideo,
  ContentVideoIframePayload,
  GenerateComprehensionTestsResponse,
  PostWatchSurveyStartResponse,
} from "@/lib/types";
import { getSession } from "@/lib/session";
import { ContentVideoPlayer } from "@/components/ContentVideoPlayer";
import { PostWatchSurveyForm } from "@/components/PostWatchSurveyForm";
import {
  DEFAULT_CONTENT_VIDEO_IFRAME_ALLOW,
  SAMPLE_HTTPS_MP4_URL,
  parseContentVideoIframeSrc,
} from "@/lib/content-video-iframe";

type CheckState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; path: string; body: string }
  | { kind: "err"; path: string; message: string };

export default function TestPage() {
  const base = getApiBase();
  const [check, setCheck] = useState<CheckState>({ kind: "idle" });
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [appOrigin, setAppOrigin] = useState("");
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoErr, setVideoErr] = useState<string | null>(null);
  const [contentVideoIdInput, setContentVideoIdInput] = useState("");
  const [contentVideoRow, setContentVideoRow] = useState<ContentVideo | null>(null);
  const [contentVideoIframe, setContentVideoIframe] = useState<ContentVideoIframePayload | null>(
    null,
  );
  const [contentVideoErr, setContentVideoErr] = useState<string | null>(null);
  const [contentVideoLoading, setContentVideoLoading] = useState(false);
  const [contentVideoTagsLoading, setContentVideoTagsLoading] = useState(false);
  const [postWatchSurvey, setPostWatchSurvey] = useState<
    PostWatchSurveyStartResponse | null
  >(null);
  const [postWatchErr, setPostWatchErr] = useState<string | null>(null);
  const [testsLoading, setTestsLoading] = useState(false);
  const [testsResult, setTestsResult] = useState<GenerateComprehensionTestsResponse | null>(
    null,
  );
  const [testsErr, setTestsErr] = useState<string | null>(null);
  /** `native` = browser controls; `custom` = React play/seek — only works with &lt;video&gt;, not cross-origin iframe. */
  const [videoControlVariant, setVideoControlVariant] = useState<
    "native" | "custom"
  >("native");

  const refreshSession = useCallback(() => {
    setSessionEmail(getSession()?.user?.email ?? null);
  }, []);

  const comprehensionIframeSrc = useMemo(() => {
    if (!contentVideoRow) {
      return null;
    }
    return comprehensionTestsIframeUrl(
      contentVideoRow.id,
      getSession()?.user?.id ?? null,
      appOrigin
        ? { summaryBaseUrl: `${appOrigin}/test/comprehension-summary` }
        : undefined,
    );
  }, [contentVideoRow?.id, sessionEmail, appOrigin]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    setAppOrigin(
      typeof window !== "undefined" ? window.location.origin : "",
    );
  }, []);

  useEffect(() => {
    setPostWatchSurvey(null);
    setPostWatchErr(null);
    setTestsResult(null);
    setTestsErr(null);
  }, [contentVideoRow?.id]);

  async function runCheck(path: string) {
    setCheck({ kind: "loading" });
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const url = `${base}${normalized}`;
    try {
      const res = await apiFetch(normalized, { method: "GET" });
      const text = await res.text();
      if (!res.ok) {
        setCheck({
          kind: "err",
          path: url,
          message: `HTTP ${res.status}: ${text.slice(0, 500)}`,
        });
        return;
      }
      setCheck({ kind: "ok", path: url, body: text });
    } catch (e) {
      setCheck({
        kind: "err",
        path: url,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  function loadVideoIframe() {
    const src = parseContentVideoIframeSrc(videoUrlInput);
    if (!src) {
      setVideoErr(
        (videoUrlInput || "").trim()
          ? "Use a valid https:// URL (same rule as the API iframe helper)."
          : "Enter a video URL.",
      );
      setVideoSrc(null);
      return;
    }
    setVideoErr(null);
    setVideoSrc(src);
  }

  async function loadContentVideoById() {
    const id = Number.parseInt(contentVideoIdInput.trim(), 10);
    if (!Number.isFinite(id) || id < 1) {
      setContentVideoErr("Enter a positive integer content video id.");
      setContentVideoRow(null);
      setContentVideoIframe(null);
      return;
    }
    setContentVideoLoading(true);
    setContentVideoErr(null);
    try {
      const row = await apiGetContentVideo(id);
      setContentVideoRow(row);
      try {
        const iframePayload = await apiGetContentVideoIframe(id);
        setContentVideoIframe(iframePayload);
      } catch {
        setContentVideoIframe(null);
      }
    } catch (e) {
      setContentVideoRow(null);
      setContentVideoIframe(null);
      setContentVideoErr(
        e instanceof Error ? e.message : "Failed to load /content-video/:id",
      );
    } finally {
      setContentVideoLoading(false);
    }
  }

  const onContentVideoEnded = useCallback(() => {
    if (!contentVideoRow) return;
    setPostWatchErr(null);
    const uid = getSession()?.user?.id ?? null;
    (async () => {
      try {
        const s = await apiPostContentVideoWatchComplete(contentVideoRow.id, uid);
        setPostWatchSurvey(s);
      } catch (e) {
        setPostWatchSurvey(null);
        setPostWatchErr(
          e instanceof Error ? e.message : "Could not start post-watch survey.",
        );
      }
    })();
  }, [contentVideoRow]);

  async function generateComprehensionTests() {
    if (!contentVideoRow) return;
    setTestsErr(null);
    setTestsLoading(true);
    try {
      const r = await apiGenerateComprehensionTests(
        contentVideoRow.id,
        getSession()?.user?.id ?? null,
      );
      setTestsResult(r);
    } catch (e) {
      setTestsResult(null);
      setTestsErr(
        e instanceof Error ? e.message : "POST /content-video/:id/tests/generate failed",
      );
    } finally {
      setTestsLoading(false);
    }
  }

  async function generateContentVideoTags() {
    if (!contentVideoRow) return;
    if (!contentVideoRow.videoCaption?.subtitlesFileLink) {
      setContentVideoErr("Captions are required. Regenerate captions on the server first.");
      return;
    }
    setContentVideoErr(null);
    setContentVideoTagsLoading(true);
    try {
      await apiGenerateContentVideoTags(contentVideoRow.id);
      setContentVideoRow(await apiGetContentVideo(contentVideoRow.id));
    } catch (e) {
      setContentVideoErr(
        e instanceof Error ? e.message : "POST /content-video/:id/tags/generate failed",
      );
    } finally {
      setContentVideoTagsLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        API test
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Quick connectivity checks against your Nest backend (
        <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">
          NEXT_PUBLIC_API_URL
        </code>
        ).
      </p>

      <section className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Configuration
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-zinc-500">Resolved API base</dt>
            <dd>
              <code className="break-all rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                {base}
              </code>
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Client session</dt>
            <dd className="text-zinc-800 dark:text-zinc-200">
              {sessionEmail ?? (
                <span className="text-zinc-500">Not signed in</span>
              )}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={refreshSession}
          className="mt-3 rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Refresh session state
        </button>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Health endpoints
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={check.kind === "loading"}
            onClick={() => runCheck("/health")}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            GET /health
          </button>
          <button
            type="button"
            disabled={check.kind === "loading"}
            onClick={() => runCheck("/status")}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            GET /status
          </button>
          <button
            type="button"
            disabled={check.kind === "loading"}
            onClick={() => runCheck("/")}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            GET /
          </button>
        </div>

        {check.kind === "loading" ? (
          <p className="mt-4 text-sm text-zinc-500">Requesting…</p>
        ) : null}
        {check.kind === "ok" ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50/80 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="text-xs text-emerald-800 dark:text-emerald-200">
              {check.path}
            </p>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-xs text-zinc-800 dark:text-zinc-200">
              {check.body}
            </pre>
          </div>
        ) : null}
        {check.kind === "err" ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50/80 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            <p className="text-xs font-mono break-all">{check.path}</p>
            <p className="mt-2 whitespace-pre-wrap">{check.message}</p>
          </div>
        ) : null}
      </section>

      <section className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Test video (ContentVideo id)
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Enter a <code className="text-xs">content_videos.id</code>, then <strong>Load video</strong>. This calls{" "}
          <code className="text-xs">GET /content-video/:id</code> and mounts the <code className="text-xs">&lt;video&gt;</code> player
          with the stored <code className="text-xs">videoLink</code>. If a WebVTT row exists, captions load on the track (S3 CORS may be
          required for the .vtt). An embed-style iframe preview is loaded from{" "}
          <code className="text-xs">GET /content-video/:id/iframe</code> when possible. When the video ends, the client calls{" "}
          <code className="text-xs">POST /content-video/:id/watch-complete</code> and shows a short survey (AI questions when{" "}
          <code className="text-xs">GEMINI_API_KEY</code> is set).{" "}
          <strong>Generate tests</strong> calls{" "}
          <code className="text-xs">POST /content-video/:id/tests/generate</code> with your session{" "}
          <code className="text-xs">userId</code> when logged in: the server fetches WebVTT text, your CEFR (
          <code className="text-xs">englishLevel</code>), and saved vocabulary to build word-meaning and &quot;why is it important&quot;
          questions at the right level.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <label className="flex items-center gap-2">
            <span className="font-medium">Player controls</span>
            <select
              value={videoControlVariant}
              onChange={(e) =>
                setVideoControlVariant(e.target.value as "native" | "custom")
              }
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="native">Native (browser)</option>
              <option value="custom">Custom (React)</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Content video id
            <input
              type="number"
              min={1}
              step={1}
              value={contentVideoIdInput}
              onChange={(e) => setContentVideoIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadContentVideoById();
              }}
              placeholder="1"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <button
            type="button"
            disabled={contentVideoLoading}
            onClick={loadContentVideoById}
            className="shrink-0 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {contentVideoLoading ? "Loading…" : "Load video"}
          </button>
        </div>
        {contentVideoErr ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{contentVideoErr}</p>
        ) : null}
        {postWatchErr ? (
          <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">{postWatchErr}</p>
        ) : null}
        {testsErr ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{testsErr}</p>
        ) : null}
        {contentVideoRow ? (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-zinc-500">
              <span className="text-zinc-600 dark:text-zinc-400">videoName:</span>{" "}
              {contentVideoRow.videoName}
            </p>
            <p className="text-xs break-all text-zinc-500">
              <span className="text-zinc-600 dark:text-zinc-400">videoLink:</span>{" "}
              {contentVideoRow.videoLink}
            </p>
            {contentVideoRow.videoCaption?.subtitlesFileLink ? (
              <p className="text-xs text-zinc-500">
                <span className="text-zinc-600 dark:text-zinc-400">WebVTT:</span>{" "}
                <span className="break-all font-mono text-zinc-600 dark:text-zinc-400">
                  {contentVideoRow.videoCaption.subtitlesFileLink}
                </span>
              </p>
            ) : null}
            <div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-zinc-500">Player</p>
                <button
                  type="button"
                  disabled={testsLoading}
                  onClick={generateComprehensionTests}
                  className="shrink-0 rounded-md border border-sky-500 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-950 hover:bg-sky-100 disabled:opacity-50 dark:border-sky-600 dark:bg-sky-950/50 dark:text-sky-100 dark:hover:bg-sky-900/60"
                >
                  {testsLoading ? "Generating tests…" : "Generate tests"}
                </button>
              </div>
              <ContentVideoPlayer
                src={contentVideoRow.videoLink}
                title={contentVideoRow.videoName}
                captionsSrc={contentVideoRow.videoCaption?.subtitlesFileLink}
                variant={videoControlVariant}
                className="mt-2"
                onEnded={onContentVideoEnded}
              />
              {testsResult ? (
                <details className="mt-3 rounded-md border border-sky-200/80 bg-sky-50/50 p-3 text-sm dark:border-sky-900/50 dark:bg-sky-950/30">
                  <summary className="cursor-pointer font-medium text-sky-900 dark:text-sky-100">
                    Comprehension + grammar ({testsResult.source})
                  </summary>
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                    Level: {testsResult.learnerCefr ?? "— (sign in for profile CEFR)"} · Transcript:{" "}
                    {testsResult.usedTranscript ? "yes" : "no"} · Saved vocab terms loaded:{" "}
                    {testsResult.vocabularyTermsUsed} · Use the iframe below to check answers, save results, and
                    update topic knowledge (or{" "}
                    <code className="text-[10px]">POST …/tests/submit</code> with the grading token).
                  </p>
                  <ol className="mt-2 list-decimal space-y-2 pl-5 text-zinc-800 dark:text-zinc-200">
                    {testsResult.tests.map((t) => (
                      <li key={t.id} className="pl-0.5">
                        <p className="font-medium">
                          <span
                            className={
                              t.category === "grammar"
                                ? "mr-2 rounded bg-violet-200 px-1.5 text-[10px] font-semibold text-violet-900 dark:bg-violet-900/50 dark:text-violet-200"
                                : "mr-2 rounded bg-cyan-200 px-1.5 text-[10px] font-semibold text-cyan-900 dark:bg-cyan-900/50 dark:text-cyan-200"
                            }
                          >
                            {t.category}
                          </span>
                          {t.question}
                        </p>
                        <ul className="mt-1 list-[circle] pl-4 text-xs text-zinc-600 dark:text-zinc-400">
                          {t.options.map((o, i) => (
                            <li key={i} className={i === t.correctIndex ? "text-emerald-700 dark:text-emerald-300" : ""}>
                              {i === t.correctIndex ? "✓ " : ""}
                              {o}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ol>
                </details>
              ) : null}
              {comprehensionIframeSrc ? (
                <details className="mt-3 rounded-md border border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-900/40">
                  <summary className="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Full test in iframe (check + save + topic updates)
                  </summary>
                  <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                    Embedded{" "}
                    <code className="rounded bg-zinc-100 px-1 text-[10px] dark:bg-zinc-800">
                      GET /content-video/:id/tests/iframe
                    </code>{" "}
                    — grammar + comprehension, then <strong>Save results</strong> posts to{" "}
                    <code className="text-[10px]">/tests/submit</code> and updates{" "}
                    <code className="text-[10px]">user_language_data</code> for topics on this content. Add{" "}
                    <code className="text-[10px]">?userId=</code> to the API URL (session id when used as{" "}
                    <code className="text-[10px]">src</code>) so the token carries your id.
                  </p>
                  <iframe
                    key={comprehensionIframeSrc}
                    title="Comprehension test"
                    src={comprehensionIframeSrc}
                    className="mt-2 h-[28rem] w-full min-h-[12rem] rounded-lg border border-zinc-200 bg-white dark:border-zinc-600 dark:bg-zinc-950"
                    sandbox="allow-scripts"
                  />
                </details>
              ) : null}
              <div className="mt-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      contentVideoTagsLoading ||
                      !contentVideoRow.videoCaption?.subtitlesFileLink
                    }
                    onClick={generateContentVideoTags}
                    className="rounded-md border border-violet-400 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-950 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-600 dark:bg-violet-950/50 dark:text-violet-100 dark:hover:bg-violet-900/60"
                  >
                    {contentVideoTagsLoading
                      ? "Generating tags…"
                      : "Generate tags from captions (AI)"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Writes CEFR system tags, theme user tags, and complexity (1–10) on{" "}
                  <code className="text-[10px]">ContentStats</code>. Needs{" "}
                  <code className="text-[10px]">GEMINI_API_KEY</code>.
                </p>
                {(() => {
                  const st = contentVideoRow.content?.stats;
                  if (!st) {
                    return (
                      <p className="mt-2 text-sm text-zinc-500">No ContentStats row yet.</p>
                    );
                  }
                  const hasData =
                    st.systemTags.length > 0 ||
                    st.userTags.length > 0 ||
                    st.processingComplexity != null;
                  if (!hasData) {
                    return (
                      <p className="mt-2 text-sm text-zinc-500">No metadata yet — run the button above.</p>
                    );
                  }
                  return (
                    <div className="mt-3 space-y-2 text-sm text-zinc-800 dark:text-zinc-200">
                      <p>
                        <span className="text-xs text-zinc-500">CEFR</span>{" "}
                        {st.systemTags.length > 0 ? st.systemTags.join(", ") : "—"}
                      </p>
                      <p>
                        <span className="text-xs text-zinc-500">Themes</span>{" "}
                        {st.userTags.length > 0 ? st.userTags.join(", ") : "—"}
                      </p>
                      <p>
                        <span className="text-xs text-zinc-500">Complexity</span>{" "}
                        <span className="font-mono font-semibold">
                          {st.processingComplexity != null ? `${st.processingComplexity} / 10` : "—"}
                        </span>
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
            {contentVideoIframe?.iframeHtml ? (
              <details className="text-sm text-zinc-600 dark:text-zinc-400">
                <summary className="cursor-pointer text-zinc-800 dark:text-zinc-200">
                  Embed-style iframe (server HTML)
                </summary>
                <div
                  className="mt-2 overflow-hidden rounded-lg border border-zinc-200 bg-black/5 dark:border-zinc-700 dark:bg-black/30 [&_iframe]:aspect-video [&_iframe]:min-h-[12rem] [&_iframe]:w-full"
                  dangerouslySetInnerHTML={{ __html: contentVideoIframe.iframeHtml }}
                />
                <pre className="mt-2 max-h-32 overflow-auto rounded-md border border-zinc-200 bg-zinc-100/80 p-2 font-mono text-[10px] text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  {contentVideoIframe.iframeHtml}
                </pre>
              </details>
            ) : contentVideoRow && !parseContentVideoIframeSrc(contentVideoRow.videoLink) ? (
              <p className="text-sm text-amber-700 dark:text-amber-200">
                Iframe HTML not available: <code className="text-xs">videoLink</code> is not a valid{" "}
                <code className="text-xs">https://</code> URL for the server iframe helper.
              </p>
            ) : null}
          </div>
        ) : null}
        {postWatchSurvey ? (
          <PostWatchSurveyForm
            surveyId={postWatchSurvey.surveyId}
            questions={postWatchSurvey.questions}
            onDismiss={() => setPostWatchSurvey(null)}
            onSubmitted={() => setPostWatchSurvey(null)}
          />
        ) : null}
      </section>

      <section className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Video (manual URL, AWS / HTTPS)
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Same <code className="text-xs">https</code> object URL as <code className="text-xs">videoLink</code> in the
          API. Main preview: <code className="text-xs">&lt;video&gt;</code> with the selected controls.
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          <code className="text-xs">generateContentVideoIframe</code> is for <strong>embed-style</strong> HTML; for UI you control, prefer{" "}
          <code className="text-xs">ContentVideoPlayer</code> on the <code className="text-xs">src</code>.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <label className="flex items-center gap-2">
            <span className="font-medium">Player controls</span>
            <select
              value={videoControlVariant}
              onChange={(e) =>
                setVideoControlVariant(e.target.value as "native" | "custom")
              }
              className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            >
              <option value="native">Native (browser)</option>
              <option value="custom">Custom (React)</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Video URL
            <input
              type="url"
              value={videoUrlInput}
              onChange={(e) => setVideoUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadVideoIframe();
              }}
              placeholder={SAMPLE_HTTPS_MP4_URL}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setVideoUrlInput(SAMPLE_HTTPS_MP4_URL);
                setVideoErr(null);
                setVideoSrc(SAMPLE_HTTPS_MP4_URL);
              }}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Use sample MP4
            </button>
            <button
              type="button"
              onClick={loadVideoIframe}
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Load video
            </button>
          </div>
        </div>
        {videoErr ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{videoErr}</p>
        ) : null}
        {videoSrc ? (
          <div className="mt-4 space-y-3">
            <ContentVideoPlayer
              src={videoSrc}
              title="Test video"
              variant={videoControlVariant}
            />
            <details className="text-sm text-zinc-600 dark:text-zinc-400">
              <summary className="cursor-pointer text-zinc-800 dark:text-zinc-200">
                Compare: iframe embed only (not controllable from React)
              </summary>
              <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200 bg-black/5 dark:border-zinc-700 dark:bg-black/30">
                <div className="aspect-video w-full min-h-[12rem]">
                  <iframe
                    key={videoSrc}
                    title="Video"
                    src={videoSrc}
                    className="h-full w-full border-0"
                    allow={DEFAULT_CONTENT_VIDEO_IFRAME_ALLOW}
                    loading="lazy"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              </div>
            </details>
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            Load a URL to try the video player and optional iframe.
          </p>
        )}
      </section>

      <section className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          More
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <li>
            <Link
              className="text-zinc-900 underline decoration-zinc-400 underline-offset-2 dark:text-zinc-100"
              href="/dashboard"
            >
              Dashboard
            </Link>{" "}
            — user profile, placement iframe
          </li>
          <li>
            <a
              className="text-zinc-900 underline decoration-zinc-400 underline-offset-2 dark:text-zinc-100"
              href={`${base}/api`}
              target="_blank"
              rel="noreferrer"
            >
              Open Swagger
            </a>{" "}
            — <code className="text-xs">/api</code> on the backend
          </li>
          <li>
            <Link
              className="text-zinc-900 underline decoration-zinc-400 underline-offset-2 dark:text-zinc-100"
              href="/test/captions"
            >
              WebVTT captions
            </Link>{" "}
            — <code className="text-xs">GET /content-video/:id</code>,{" "}
            <code className="text-xs">POST .../captions/regenerate</code> (Deepgram)
          </li>
        </ul>
      </section>
    </main>
  );
}
