import { HTMLAttributes, useRef, useState } from "react";
import { cn } from "../lib/utils";

interface VideoPlayerProps extends HTMLAttributes<HTMLDivElement> {
  src: string;
  onEnded?: () => void;
  /** Fires when playback starts (each play after pause, or initial play). */
  onPlay?: () => void;
  /** Subscribe to playback time updates (for syncing transcript). */
  onPlaybackTime?: (seconds: number) => void;
  /** Fires each `timeupdate` with `currentTime / duration` in [0,1] when duration is known. */
  onPlaybackFraction?: (fraction: number) => void;
  /** Access the `<video>` element for seeking from the sidebar. */
  onVideoMount?: (el: HTMLVideoElement | null) => void;
}

export default function VideoPlayer({
  src,
  onEnded,
  onPlay,
  onPlaybackTime,
  onPlaybackFraction,
  onVideoMount,
  className,
  ...rest
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  function setVideoNode(node: HTMLVideoElement | null) {
    videoRef.current = node;
    onVideoMount?.(node);
  }
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  function handleToggle() {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying((prev) => !prev);
  }

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;

    const { currentTime, duration } = video;
    setCurrentTime(currentTime);
    const dur =
      duration && Number.isFinite(duration) && duration > 0 ? duration : 0;
    const frac = dur > 0 ? currentTime / dur : 0;
    setProgress(dur > 0 ? frac * 100 : 0);
    onPlaybackTime?.(currentTime);
    if (dur > 0) onPlaybackFraction?.(Math.min(1, Math.max(0, frac)));
  }

  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (!video) return;

    setDuration(video.duration);
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const newTime = ratio * videoRef.current.duration;
    videoRef.current.currentTime = newTime;
    setProgress(ratio * 100);
    setCurrentTime(newTime);
    const dur = videoRef.current.duration;
    if (dur && Number.isFinite(dur) && dur > 0) {
      onPlaybackFraction?.(Math.min(1, Math.max(0, newTime / dur)));
    }
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div
      className={cn(
        "group relative flex aspect-video w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl bg-gray-950",
        className,
      )}
      onClick={handleToggle}
      {...rest}
    >
      <video
        ref={setVideoNode}
        src={src}
        className="absolute inset-0 w-full h-full object-cover"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => {
          setPlaying(true);
          onPlay?.();
        }}
        onEnded={() => {
          setPlaying(false);
          onEnded?.();
        }}
      />

      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          }`}
      >
        <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-colors">
          {playing ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-white/60"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-6 h-6 text-white/60"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8 bg-linear-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-full h-1.5 bg-white/20 rounded-full cursor-pointer mb-2 relative"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-(--purple-default) rounded-full pointer-events-none"
            style={{ width: `${progress}%` }}
          />

          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow pointer-events-none"
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-white/60 text-xs tabular-nums">
            {formatTime(currentTime)}
          </span>
          <span className="text-white/40 text-xs tabular-nums">
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
