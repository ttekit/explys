import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { apiFetch } from "../../lib/api";
import { useUser } from "../../context/UserContext";
import { CatalogSidebar } from "../../components/catalog/CatalogSidebar";
import {
  CatalogVideoCard,
  type CatalogCardVideo,
} from "../../components/catalog/CatalogVideoCard";
import { ChameleonMascot } from "../../components/ChameleonMascot";
import { SEO } from "../../components/SEO/SEO";
import { resolveCanonicalUrl } from "../../lib/siteUrl";

interface ContentVideo {
  id: number;
  videoName: string;
  videoDescription: string | null;
  videoLink: string;
  content: {
    category: {
      name: string;
      description: string;
    };
  };
}

function toCardVideo(video: ContentVideo): CatalogCardVideo {
  return {
    id: video.id,
    title: video.videoName,
    categoryLabel: video.content.category.name,
    progress: 100,
  };
}

export default function WatchedLessonsPage() {
  const { user } = useUser();
  const [videos, setVideos] = useState<ContentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch("/content-video/watched", { method: "GET" });
        if (cancelled) return;
        if (!res.ok) {
          setError("Could not load watched lessons.");
          setVideos([]);
          return;
        }
        const data: unknown = await res.json();
        setVideos(Array.isArray(data) ? (data as ContentVideo[]) : []);
      } catch {
        if (!cancelled) {
          setError("Could not load watched lessons.");
          setVideos([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo(() => videos.map(toCardVideo), [videos]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <SEO
        title="Watched lessons"
        description="Your completed lessons on Explys."
        canonicalUrl={resolveCanonicalUrl("/watched-lessons")}
        noindex
      />
      <div className="flex">
        <CatalogSidebar
          categories={[]}
          selectedCategory="All"
          onSelectCategory={() => {}}
          showCategoryFilter={false}
          welcomeName={
            user?.name?.trim() ? user.name.trim().split(/\s+/)[0] : undefined
          }
          englishLevel={user?.englishLevel || undefined}
        />

        <main className="ml-0 flex-1 pb-28 lg:ml-64 lg:pb-12">
          <div className="border-border border-b bg-card/30 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-start gap-3">
                <ChameleonMascot size="sm" mood="happy" animate={false} />
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                    Watched Lessons
                  </h1>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                    Every lesson you&apos;ve finished at least once (from your
                    watch history). Open any clip to review or take the quiz
                    again.
                  </p>
                </div>
              </div>
              <Link
                to="/catalog"
                className="text-sm font-medium text-primary hover:underline"
              >
                Browse catalog
              </Link>
            </div>
          </div>

          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-24">
                <div
                  className="border-muted h-12 w-12 animate-spin rounded-full border-4 border-t-primary border-solid"
                  aria-hidden
                />
                <p className="text-sm text-muted-foreground">
                  Loading your lessons…
                </p>
              </div>
            ) : error ? (
              <p className="text-destructive text-center text-sm">{error}</p>
            ) : cards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
                <p className="font-medium text-foreground">
                  No watched lessons yet
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Watch at least 75% of a catalog video to count it here.
                </p>
                <Link
                  to="/catalog"
                  className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Go to catalog
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((video) => (
                  <CatalogVideoCard
                    key={video.id}
                    video={video}
                    showProgress
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
