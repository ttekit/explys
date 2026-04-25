/**
 * Same rules as backend `generateContentVideoIframe` (HTTPS-only public video URL).
 */
export type ContentVideoIframeOptions = {
  title?: string;
  width?: string;
  height?: string;
  className?: string;
  allow?: string;
  loading?: "eager" | "lazy";
};

export const DEFAULT_CONTENT_VIDEO_IFRAME_ALLOW =
  "autoplay; fullscreen; encrypted-media; picture-in-picture";

/** Short, lightweight clip — fine for quick iframe / &lt;video&gt; UI checks. */
export const SAMPLE_HTTPS_MP4_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

/**
 * Public HTTPS MP4 (Big Buck Bunny, 10s, ~10MB) — for Deepgram / WebVTT caption tests.
 * Point `content_videos.video_link` at this URL in Prisma (or S3) when testing captions.
 */
export const TEST_VIDEO_URL_FOR_CAPTIONS =
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_10MB.mp4";

export function parseContentVideoIframeSrc(raw: string): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  try {
    const href = new URL(t);
    if (href.protocol !== "https:") return null;
    return href.toString();
  } catch {
    return null;
  }
}
