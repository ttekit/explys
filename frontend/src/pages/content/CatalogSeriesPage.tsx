import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ListVideo, ArrowLeft, Play } from "lucide-react";
import { apiFetch, getResponseErrorMessage } from "../../lib/api";
import {
  parseSeriesPlaylistPayload,
  type SeriesPlaylistPayload,
} from "../../lib/catalogPlaylist";
import { SEO } from "../../components/SEO/SEO";
import { resolveCanonicalUrl } from "../../lib/siteUrl";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { cn } from "../../lib/utils";

/**
 * Full playlist view for one series (`Content`), ordered by backend playlist positions.
 */
export default function CatalogSeriesPage() {
  const { friendlyLink: friendlyLinkParam } = useParams<{
    friendlyLink: string;
  }>();
  const friendlyLink = friendlyLinkParam ? decodeURIComponent(friendlyLinkParam) : "";
  const { messages, locale } = useLandingLocale();
  const catalogSeo = messages.catalogPage;

  const [payload, setPayload] = useState<SeriesPlaylistPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!friendlyLink.trim()) {
      setPayload(null);
      setLoading(false);
      setError("Missing series link.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const path = `/contents/series/${encodeURIComponent(friendlyLink)}`;
        const res = await apiFetch(path, { method: "GET" });
        if (!res.ok) {
          const msg = await getResponseErrorMessage(res);
          if (!cancelled) {
            setPayload(null);
            setError(msg);
          }
          return;
        }
        const json: unknown = await res.json();
        const parsed = parseSeriesPlaylistPayload(json);
        if (!cancelled) {
          setPayload(parsed);
          setError(parsed ? null : "Could not read playlist data.");
        }
      } catch (e) {
        if (!cancelled) {
          setPayload(null);
          setError(e instanceof Error ? e.message : "Request failed.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [friendlyLink]);

  const title = useMemo(() => {
    if (payload?.name?.trim()) {
      return `${payload.name} — playlist | Explys`;
    }
    return `${catalogSeo.title} — playlist`;
  }, [payload?.name, catalogSeo.title]);

  const canonicalPath = `/catalog/series/${encodeURIComponent(friendlyLink)}`;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <SEO
        title={title}
        description={payload?.description?.trim() || catalogSeo.description}
        canonicalUrl={resolveCanonicalUrl(canonicalPath)}
        ogLocale={locale === "uk" ? "uk_UA" : "en_US"}
        ogLocaleAlternate={locale === "uk" ? "en_US" : "uk_UA"}
      />

      <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Catalog
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
        {loading ?
          <p className="text-sm text-muted-foreground">Loading playlist…</p>
        : error ?
          <p className="text-sm text-destructive">{error}</p>
        : payload ?
          <>
            <div className="mb-8 flex gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary"
                aria-hidden
              >
                <ListVideo className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  {payload.name}
                </h1>
                {payload.description?.trim() ?
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {payload.description}
                  </p>
                : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {payload.episodes.length}{" "}
                  {payload.episodes.length === 1 ? "episode" : "episodes"}
                </p>
              </div>
            </div>

            <ol className="space-y-2">
              {payload.episodes.map((ep) => (
                <li key={ep.contentVideoId}>
                  <Link
                    to={`/content/${ep.contentVideoId}`}
                    className={cn(
                      "flex gap-4 rounded-2xl border border-border bg-card/40 px-4 py-3 transition-colors",
                      "hover:border-primary/40 hover:bg-card/70",
                    )}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-semibold text-foreground">
                      {ep.index}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">
                        {ep.videoName}
                      </p>
                      {ep.videoDescription?.trim() ?
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {ep.videoDescription}
                        </p>
                      : null}
                    </div>
                    <span className="flex shrink-0 items-center text-primary">
                      <Play className="h-5 w-5" aria-hidden />
                      <span className="sr-only">Open lesson</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </>
        : null}
      </main>
    </div>
  );
}
