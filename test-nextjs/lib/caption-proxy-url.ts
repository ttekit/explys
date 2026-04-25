/**
 * Browsers CORS-block direct fetch() to S3/CloudFront from the app origin.
 * Returns a same-origin URL that the Next API route can resolve server-side.
 */
export function captionProxyFetchUrl(captionsSrc: string): string {
  if (typeof window === "undefined") {
    return captionsSrc;
  }
  try {
    const u = new URL(captionsSrc, window.location.href);
    if (u.origin === window.location.origin) {
      return captionsSrc;
    }
  } catch {
    return captionsSrc;
  }
  return `/api/caption-proxy?url=${encodeURIComponent(captionsSrc)}`;
}
