"use client";

import {
  useRef,
  useState,
  type HTMLAttributes,
} from "react";

interface VideoPlayerProps extends HTMLAttributes<HTMLDivElement> {
  src: string;
}

export default function VideoPlayer({ src, ...props }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  function handleToggle() {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      void videoRef.current.play();
    }
    setPlaying((prev) => !prev);
  }

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;

    const { currentTime: ct, duration: dur } = video;
    setCurrentTime(ct);
    setProgress(dur ? (ct / dur) * 100 : 0);
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
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div
      className="w-full aspect-video bg-gray-950 rounded-xl overflow-hidden flex items-center justify-center group cursor-pointer relative"
      onClick={handleToggle}
      {...props}
    >
      <video
        ref={videoRef}
        src={src}
        className="absolute inset-0 w-full h-full object-cover"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setPlaying(false)}
      />

      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
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
