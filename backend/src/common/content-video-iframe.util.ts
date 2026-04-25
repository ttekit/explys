/**
 * Build an HTML5 iframe pointing at a video file URL (e.g. public S3 object URL from
 * `publicS3ObjectUrl`). The browser will use its built-in video handling for the iframe document.
 */
export type GenerateContentVideoIframeOptions = {
  /** `title` attribute (accessibility). */
  title?: string;
  width?: string;
  height?: string;
  className?: string;
  /**
   * `allow` feature policy for the iframe, e.g. fullscreen.
   * @default "autoplay; fullscreen; encrypted-media; picture-in-picture"
   */
  allow?: string;
  /** `loading` attribute (e.g. "lazy"). */
  loading?: "eager" | "lazy";
};

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/**
 * @param videoLink HTTPS URL to the video object (e.g. `https://bucket.s3.region.amazonaws.com/.../file.mp4`)
 * @returns HTML string with a single `<iframe>` element, or empty string if the URL is invalid/unsafe
 */
export function generateContentVideoIframe(
  videoLink: string,
  options: GenerateContentVideoIframeOptions = {},
): string {
  const raw = (videoLink ?? "").trim();
  if (!raw) {
    return "";
  }

  let href: URL;
  try {
    href = new URL(raw);
  } catch {
    return "";
  }

  if (href.protocol !== "https:") {
    return "";
  }

  const src = escapeHtmlAttr(href.toString());
  const title = options.title != null && options.title !== ""
    ? escapeHtmlAttr(options.title)
    : escapeHtmlAttr("Video");
  const classAttr =
    options.className != null && options.className !== ""
      ? ` class="${escapeHtmlAttr(options.className)}"`
      : "";
  const width = options.width ?? "100%";
  const height = options.height ?? "100%";
  const allow =
    options.allow ??
    "autoplay; fullscreen; encrypted-media; picture-in-picture";
  const allowAttr = escapeHtmlAttr(allow);
  const loading = options.loading;
  const loadingAttr =
    loading != null ? ` loading="${escapeHtmlAttr(loading)}"` : "";

  // aspect-video-friendly default: min size so the iframe is visible in layouts
  const style = escapeHtmlAttr("border:0;min-height:12rem;");

  return `<iframe${classAttr} src="${src}" title="${title}" width="${escapeHtmlAttr(width)}" height="${escapeHtmlAttr(height)}" allow="${allowAttr}" style="${style}"${loadingAttr} referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}
