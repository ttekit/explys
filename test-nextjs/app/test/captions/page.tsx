"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  apiCreateContentWithVideo,
  apiGenerateContentVideoTags,
  apiGetContentVideo,
  apiRegenerateContentVideoCaptions,
  getApiBase,
} from "@/lib/api";
import {
  contentVideoIdFromCreateContent,
  type ContentVideo,
  type VideoCaptions,
} from "@/lib/types";
import { ContentVideoPlayer } from "@/components/ContentVideoPlayer";
import { TEST_VIDEO_URL_FOR_CAPTIONS } from "@/lib/content-video-iframe";
import { captionProxyFetchUrl } from "@/lib/caption-proxy-url";

export default function TestCaptionsPage() {
  const base = getApiBase();
  const [idInput, setIdInput] = useState("");
  const [loading, setLoading] = useState<
    "fetch" | "regen" | "upload" | "tags" | null
  >(null);
  const [uploadName, setUploadName] = useState("Caption test");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [video, setVideo] = useState<ContentVideo | null>(null);
  const [regenResult, setRegenResult] = useState<VideoCaptions | null | "skipped">(
    null,
  );
  const [vttPreview, setVttPreview] = useState<string | null>(null);
  const [vttErr, setVttErr] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [playerVariant, setPlayerVariant] = useState<"native" | "custom">(
    "native",
  );

  const id = Number.parseInt(idInput.trim(), 10);
  const idValid = Number.isFinite(id) && id > 0;

  const uploadToAwsAndCapture = useCallback(async () => {
    if (!uploadFile) {
      setErr("Choose an .mp4 file first.");
      return;
    }
    const n = uploadName.trim();
    if (n.length < 2) {
      setErr("Name must be at least 2 characters (API validation).");
      return;
    }
    setErr(null);
    setLoading("upload");
    setRegenResult(null);
    setVttPreview(null);
    setVttErr(null);
    setVideo(null);
    try {
      const friendlyLink = `caption-test-${Date.now()}`;
      const data = await apiCreateContentWithVideo({
        file: uploadFile,
        name: n,
        description: "Test upload from /test/captions (UI)",
        friendlyLink,
      });
      const cvId = contentVideoIdFromCreateContent(data);
      if (cvId == null) {
        throw new Error("Response did not include a ContentVideo id.");
      }
      setIdInput(String(cvId));
      const v = await apiGetContentVideo(cvId);
      setVideo(v);
    } catch (e) {
      setVideo(null);
      setErr(e instanceof Error ? e.message : "Upload / caption failed");
    } finally {
      setLoading(null);
    }
  }, [uploadFile, uploadName]);

  const loadVideo = useCallback(async () => {
    if (!idValid) {
      setErr("Enter a valid content video id (positive integer).");
      return;
    }
    setErr(null);
    setLoading("fetch");
    setRegenResult(null);
    setVttPreview(null);
    setVttErr(null);
    try {
      const v = await apiGetContentVideo(id);
      setVideo(v);
    } catch (e) {
      setVideo(null);
      setErr(e instanceof Error ? e.message : "GET failed");
    } finally {
      setLoading(null);
    }
  }, [id, idValid]);

  const generateTags = useCallback(async () => {
    if (!video) {
      setErr("Load a content video first.");
      return;
    }
    setErr(null);
    setLoading("tags");
    try {
      await apiGenerateContentVideoTags(video.id);
      const v = await apiGetContentVideo(video.id);
      setVideo(v);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Tag generation failed");
    } finally {
      setLoading(null);
    }
  }, [video]);

  const regenerate = useCallback(async () => {
    if (!idValid) {
      setErr("Enter a valid content video id (positive integer).");
      return;
    }
    setErr(null);
    setLoading("regen");
    setVttPreview(null);
    setVttErr(null);
    try {
      const r = await apiRegenerateContentVideoCaptions(id);
      setRegenResult(r == null ? "skipped" : r);
      const v = await apiGetContentVideo(id);
      setVideo(v);
    } catch (e) {
      setRegenResult(null);
      setErr(e instanceof Error ? e.message : "Regenerate failed");
    } finally {
      setLoading(null);
    }
  }, [id, idValid]);

  const vttUrl =
    video?.videoCaption?.subtitlesFileLink ??
    (typeof regenResult === "object" && regenResult
      ? regenResult.subtitlesFileLink
      : null);

  async function loadVttPreview() {
    if (!vttUrl) return;
    setVttErr(null);
    setVttPreview(null);
    try {
      const r = await fetch(captionProxyFetchUrl(vttUrl), {
        credentials: "same-origin",
      });
      if (!r.ok) {
        setVttErr(`HTTP ${r.status}`);
        return;
      }
      const text = await r.text();
      setVttPreview(text.slice(0, 4000) + (text.length > 4000 ? "\n…" : ""));
    } catch (e) {
      setVttErr(e instanceof Error ? e.message : "Fetch failed");
    }
  }

  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-10">
      <p className="text-sm text-zinc-500">
        <Link
          className="text-zinc-600 underline dark:text-zinc-400"
          href="/test"
        >
          ← API test
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        WebVTT captions (Deepgram)
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Exercises <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">GET /content-video/:id</code> and{" "}
        <code className="text-xs">POST /content-video/:id/captions/regenerate</code> against{" "}
        <code className="text-xs break-all">{base}</code>
        . The API must have <code className="text-xs">DEEPGRAM_API_KEY</code> set; if unset, regenerate returns
        and the row is skipped.
      </p>

      <section
        className="mt-6 rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30"
        aria-label="Upload video to S3 and generate captions"
      >
        <h2 className="text-xs font-medium uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
          Upload MP4 → AWS (S3) → captions
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Calls <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">POST /contents/create</code>: the
          file is stored in your bucket, a <code className="text-xs">content_videos</code> row is created, and the
          server runs the same WebVTT pipeline as a normal upload. Request may take a while while Deepgram runs. Max
          file size <strong>100 MB</strong> (API limit). Only <code className="text-xs">video/mp4</code>.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Display name (content + video name)
            <input
              type="text"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              className="mt-1 w-full max-w-md rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <div>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              MP4 file
            </label>
            <input
              type="file"
              accept="video/mp4,.mp4"
              className="mt-1 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-md file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm dark:text-zinc-400 dark:file:border-zinc-600 dark:file:bg-zinc-900"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setUploadFile(f);
                setErr(null);
              }}
            />
            {uploadFile ? (
              <p className="mt-1 text-xs text-zinc-500">
                {uploadFile.name} — {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={loading !== null}
            onClick={uploadToAwsAndCapture}
            className="rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {loading === "upload"
              ? "Uploading & generating captions…"
              : "Upload to S3 & generate captions"}
          </button>
        </div>
      </section>

      <section
        className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
        aria-label="Test video URL for Deepgram"
      >
        <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Test video link (speech → caption text)
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Use a <strong>public <code className="text-xs">https</code> URL</strong> Deepgram can fetch. The
          link below is a short Big Buck Bunny sample from{" "}
          <code className="text-xs">test-videos.co.uk</code>. Set{" "}
          <code className="text-xs">content_videos.video_link</code> to it, then use that row’s id
          here.
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <code className="block min-w-0 flex-1 break-all rounded border border-zinc-200 bg-white px-2 py-2 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
            {TEST_VIDEO_URL_FOR_CAPTIONS}
          </code>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                setCopyHint(null);
                try {
                  await navigator.clipboard.writeText(TEST_VIDEO_URL_FOR_CAPTIONS);
                  setCopyHint("Copied");
                  setTimeout(() => setCopyHint(null), 2000);
                } catch {
                  setCopyHint("Copy failed (browser blocked clipboard)");
                }
              }}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {copyHint === "Copied" ? "Copied ✓" : "Copy"}
            </button>
            <a
              className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              href={TEST_VIDEO_URL_FOR_CAPTIONS}
              target="_blank"
              rel="noreferrer"
            >
              Open
            </a>
          </div>
        </div>
        {copyHint && copyHint !== "Copied" ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-200">{copyHint}</p>
        ) : null}
      </section>

      <section className="mt-8 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block min-w-0 flex-1 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Content video id
            <input
              type="number"
              min={1}
              step={1}
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadVideo();
              }}
              placeholder="1"
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loading !== null}
              onClick={loadVideo}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {loading === "fetch" ? "Loading…" : "Load video"}
            </button>
            <button
              type="button"
              disabled={loading !== null}
              onClick={regenerate}
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading === "regen" ? "Regenerating…" : "Regenerate captions"}
            </button>
            <button
              type="button"
              disabled={loading !== null || !vttUrl}
              onClick={generateTags}
              className="rounded-md border border-violet-400 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-950 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-600 dark:bg-violet-950/50 dark:text-violet-100 dark:hover:bg-violet-900/60"
              title={
                vttUrl
                  ? "Gemini: CEFR, themes, complexity → ContentStats"
                  : "Need captions first"
              }
            >
              {loading === "tags" ? "Generating tags…" : "Generate tags (AI)"}
            </button>
          </div>
        </div>

        {err ? (
          <p className="whitespace-pre-wrap text-sm text-red-600 dark:text-red-400">
            {err}
          </p>
        ) : null}

        {regenResult === "skipped" ? (
          <p className="text-sm text-amber-800 dark:text-amber-200">
            API returned without creating captions (e.g. <code className="text-xs">DEEPGRAM_API_KEY</code> not set
            on the server).
          </p>
        ) : null}
        {typeof regenResult === "object" && regenResult ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50/80 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">
              Last regenerate result
            </p>
            <pre className="mt-2 max-h-32 overflow-auto font-mono text-xs text-zinc-800 dark:text-zinc-200">
              {JSON.stringify(regenResult, null, 2)}
            </pre>
          </div>
        ) : null}

        {video ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Player
                </h2>
                <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  Controls
                  <select
                    value={playerVariant}
                    onChange={(e) =>
                      setPlayerVariant(e.target.value as "native" | "custom")
                    }
                    className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-900 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="native">Native</option>
                    <option value="custom">Custom</option>
                  </select>
                </label>
              </div>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                {video.id} — {video.videoName}
              </p>
              <div className="mt-4 max-w-4xl">
                <ContentVideoPlayer
                  key={`${video.id}-${video.videoLink}`}
                  src={video.videoLink}
                  title={video.videoName}
                  captionsSrc={vttUrl ?? undefined}
                  variant={playerVariant}
                />
              </div>
              <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                <h3 className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  ContentStats (from captions + Gemini)
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  <strong>System</strong> = CEFR (A1, B2, …), <strong>User</strong> = themes
                  (Fitness, Nature, …), <strong>Complexity</strong> = 1–10 processing load. Also runs
                  when captions are generated on the server.
                </p>
                {(() => {
                  const st = video.content?.stats;
                  if (!st) {
                    return (
                      <p className="mt-2 text-sm text-zinc-500">
                        No ContentStats row yet — use &quot;Generate tags (AI)&quot; after captions exist.
                      </p>
                    );
                  }
                  const hasData =
                    st.systemTags.length > 0 ||
                    st.userTags.length > 0 ||
                    st.processingComplexity != null;
                  if (!hasData) {
                    return (
                      <p className="mt-2 text-sm text-zinc-500">
                        No metadata yet — run &quot;Generate tags (AI)&quot; (needs{" "}
                        <code className="text-xs">GEMINI_API_KEY</code>).
                      </p>
                    );
                  }
                  return (
                    <div className="mt-3 space-y-3 text-sm text-zinc-800 dark:text-zinc-200">
                      <div>
                        <p className="text-xs font-medium text-zinc-500">System (CEFR)</p>
                        <ul className="mt-1 flex flex-wrap gap-2">
                          {st.systemTags.length > 0 ? (
                            st.systemTags.map((s: string) => (
                              <li
                                key={s}
                                className="rounded-full border border-sky-300 bg-sky-50 px-2.5 py-0.5 dark:border-sky-700 dark:bg-sky-950/60"
                              >
                                {s}
                              </li>
                            ))
                          ) : (
                            <li className="text-zinc-500">—</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-500">User (themes)</p>
                        <ul className="mt-1 flex flex-wrap gap-2">
                          {st.userTags.length > 0 ? (
                            st.userTags.map((s: string) => (
                              <li
                                key={s}
                                className="rounded-full border border-violet-300 bg-violet-50 px-2.5 py-0.5 dark:border-violet-700 dark:bg-violet-950/50"
                              >
                                {s}
                              </li>
                            ))
                          ) : (
                            <li className="text-zinc-500">—</li>
                          )}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-zinc-500">Complexity (1–10)</p>
                        <p className="mt-1 font-mono text-base font-semibold">
                          {st.processingComplexity != null
                            ? `${st.processingComplexity} / 10`
                            : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <details className="rounded-lg border border-zinc-200 bg-white/60 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950/40">
              <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400">
                Raw URLs (debug)
              </summary>
              <dl className="mt-3 space-y-2 text-xs">
                <div>
                  <dt className="text-zinc-500">videoLink</dt>
                  <dd className="break-all font-mono text-zinc-800 dark:text-zinc-200">
                    {video.videoLink}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">subtitles (DB)</dt>
                  <dd>
                    {vttUrl ? (
                      <span className="break-all font-mono text-zinc-800 dark:text-zinc-200">
                        {vttUrl}
                      </span>
                    ) : (
                      <span className="text-zinc-500">— none yet</span>
                    )}
                  </dd>
                </div>
              </dl>
              {vttUrl ? (
                <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={loadVttPreview}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Load raw WebVTT text (CORS)
                  </button>
                  {vttErr ? (
                    <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                      {vttErr}
                    </p>
                  ) : null}
                  {vttPreview ? (
                    <pre className="mt-2 max-h-40 overflow-auto rounded border border-zinc-200 bg-zinc-50 p-2 font-mono text-[10px] text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                      {vttPreview}
                    </pre>
                  ) : null}
                </div>
              ) : null}
            </details>
          </div>
        ) : null}
      </section>
    </main>
  );
}
