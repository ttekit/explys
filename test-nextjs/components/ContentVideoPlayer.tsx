"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { captionProxyFetchUrl } from "@/lib/caption-proxy-url";
import { findActiveCue, parseWebVtt, type WebVttCue } from "@/lib/parse-webvtt";

export type ContentVideoPlayerProps = {
  src: string;
  title?: string;
  className?: string;
  /**
   * Public HTTPS URL to a WebVTT file (e.g. `VideoCaptions.subtitlesFileLink`).
   * Fetched, parsed, and shown **below** the video (not burned into the video frame).
   */
  captionsSrc?: string;
  /**
   * - `native` — browser default controls (recommended).
   * - `custom` — play/pause + seek from your React state (no access needed inside an iframe).
   */
  variant?: "native" | "custom";
  /** Fires when playback reaches the end of the resource (native and custom controls). */
  onEnded?: () => void;
};

function formatTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Renders a **&lt;video&gt;** for an HTTPS `src` (e.g. S3 `videoLink`).
 * You cannot add or drive controls for a **cross-origin iframe** that points at a file URL; use this
 * player in the app instead of an iframe when you need reliable controls.
 */
export function ContentVideoPlayer({
  src,
  title = "Video",
  className = "",
  captionsSrc,
  variant = "native",
  onEnded,
}: ContentVideoPlayerProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const cuesRef = useRef<WebVttCue[]>([]);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [cues, setCues] = useState<WebVttCue[]>([]);
  const [cuesReady, setCuesReady] = useState(false);
  const [activeCaption, setActiveCaption] = useState<string | null>(null);
  const [captionsError, setCaptionsError] = useState<string | null>(null);

  const updateActiveCaption = useCallback((t: number) => {
    const c = findActiveCue(cuesRef.current, t);
    setActiveCaption(c?.text ?? null);
  }, []);

  useEffect(() => {
    cuesRef.current = cues;
    const v = ref.current;
    if (v) updateActiveCaption(v.currentTime);
  }, [cues, updateActiveCaption]);

  useEffect(() => {
    if (!captionsSrc) {
      setCues([]);
      setCuesReady(true);
      setCaptionsError(null);
      setActiveCaption(null);
      return;
    }
    let cancelled = false;
    setCuesReady(false);
    setCaptionsError(null);
    (async () => {
      try {
        const r = await fetch(captionProxyFetchUrl(captionsSrc), {
          credentials: "same-origin",
        });
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}`);
        }
        const raw = await r.text();
        if (cancelled) return;
        const parsed = parseWebVtt(raw);
        setCues(parsed);
        if (parsed.length === 0 && raw.trim().length > 0) {
          setCaptionsError("Could not parse WebVTT (unsupported format).");
        }
      } catch (e) {
        if (!cancelled) {
          setCues([]);
          setCaptionsError(
            e instanceof Error
              ? e.message
              : "Failed to load captions.",
          );
        }
      } finally {
        if (!cancelled) {
          setCuesReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [captionsSrc]);

  const sync = useCallback(() => {
    const v = ref.current;
    if (!v) return;
    setCurrent(v.currentTime);
    setDuration(Number.isFinite(v.duration) ? v.duration : 0);
    setPlaying(!v.paused);
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onT = () => {
      const t = v.currentTime;
      setCurrent(t);
      const c = findActiveCue(cuesRef.current, t);
      setActiveCaption(c?.text ?? null);
    };
    const onMeta = () => {
      setDuration(Number.isFinite(v.duration) ? v.duration : 0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    v.addEventListener("timeupdate", onT);
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("timeupdate", onT);
      v.removeEventListener("loadedmetadata", onMeta);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
    };
  }, [src, captionsSrc]);

  function toggle() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
    } else {
      v.pause();
    }
  }

  const native = variant === "native";

  return (
    <div
      className={`overflow-hidden rounded-lg border border-zinc-200 bg-black dark:border-zinc-700 ${className}`}
    >
      <video
        key={`${src}|${captionsSrc ?? ""}`}
        ref={ref}
        className="aspect-video w-full min-h-[12rem] bg-black object-contain"
        src={src}
        title={title}
        controls={native}
        playsInline
        preload="metadata"
        onLoadedMetadata={sync}
        onEnded={onEnded}
      />
      {!native ? (
        <div className="flex flex-col gap-2 border-t border-zinc-800 bg-zinc-950/95 p-3 text-sm text-zinc-100">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              className="rounded-md bg-zinc-100 px-3 py-1.5 text-zinc-900 hover:bg-white"
            >
              {playing ? "Pause" : "Play"}
            </button>
            <span className="font-mono text-xs text-zinc-400">
              {formatTime(current)} / {formatTime(duration)}
            </span>
          </div>
          <input
            type="range"
            className="w-full accent-zinc-100"
            min={0}
            max={duration > 0 ? duration : 0}
            step={0.05}
            value={Math.min(current, duration || 0)}
            onChange={(e) => {
              const t = parseFloat(e.target.value);
              const v = ref.current;
              if (v) v.currentTime = t;
              setCurrent(t);
              const c = findActiveCue(cuesRef.current, t);
              setActiveCaption(c?.text ?? null);
            }}
          />
        </div>
      ) : null}
      {captionsSrc ? (
        <div
          className="border-t border-zinc-200 bg-zinc-100/90 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900/90"
          aria-live="polite"
        >
          {captionsError ? (
            <p className="text-center text-sm text-amber-800 dark:text-amber-200">
              {captionsError}
            </p>
          ) : (
            <p className="min-h-[2.75rem] text-center text-base leading-relaxed text-zinc-900 dark:text-zinc-100">
              {!cuesReady ? (
                <span className="text-zinc-500 dark:text-zinc-400">
                  Loading captions…
                </span>
              ) : activeCaption != null && activeCaption !== "" ? (
                <span className="font-medium">{activeCaption}</span>
              ) : cues.length > 0 ? (
                <span className="text-zinc-300 dark:text-zinc-600">&nbsp;</span>
              ) : (
                <span className="text-zinc-500 dark:text-zinc-400">
                  No timed cues in this WebVTT file
                </span>
              )}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
