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
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 lg:px-8">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Catalog
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 pb-24 lg:px-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading playlist…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : payload ? (
          <>
            <div className="mb-10 flex gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary"
                aria-hidden
              >
                <ListVideo className="h-7 w-7" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
                  {payload.name}
                </h1>
                {payload.description?.trim() ? (
                  <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
                    {payload.description}
                  </p>
                ) : null}
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  {payload.episodes.length}{" "}
                  {payload.episodes.length === 1 ? "episode" : "episodes"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {payload.episodes.map((ep) => {
                const thumb = (ep as { thumbnailUrl?: string }).thumbnailUrl;
                const videoLink = (ep as { videoLink?: string }).videoLink;

                return (
                  <Link
                    key={ep.contentVideoId}
                    to={`/content/${ep.contentVideoId}`}
                    className="group flex cursor-pointer flex-col gap-3 rounded-2xl p-2 transition-all duration-300 hover:bg-muted/50"
                  >
                    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-zinc-800 shadow-sm">
                      {thumb ? (
                        <img
                          src={thumb}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          alt=""
                        />
                      ) : videoLink ? (
                        <video
                          src={`${videoLink}#t=0.1`}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          preload="metadata"
                          muted
                          playsInline
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                          <Play className="h-8 w-8 text-zinc-700" />
                        </div>
                      )}

                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
                          <Play className="h-6 w-6 fill-white text-white" />
                        </div>
                      </div>

                      <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                        EPISODE {ep.index}
                      </div>
                    </div>

                    <div className="px-1 pb-2">
                      <h4 className="line-clamp-1 font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
                        {ep.videoName}
                      </h4>
                      {ep.videoDescription?.trim() ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                          {ep.videoDescription}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}