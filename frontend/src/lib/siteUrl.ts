/** Public origin for canonical and Open Graph URLs. Set `VITE_SITE_URL` in production (e.g. https://explys.com). */
export function getSiteUrl(): string {
  const env = import.meta.env.VITE_SITE_URL;
  if (typeof env === "string" && env.trim().length > 0) {
    return env.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://explys.com";
}

/** Build an absolute URL from a path (`/catalog`) or pass through an absolute URL. */
export function resolveCanonicalUrl(pathOrAbsolute: string): string {
  if (/^https?:\/\//i.test(pathOrAbsolute)) {
    return pathOrAbsolute;
  }
  const path =
    pathOrAbsolute.startsWith("/") ? pathOrAbsolute : `/${pathOrAbsolute}`;
  return `${getSiteUrl()}${path}`;
}
