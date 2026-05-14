import { useRef } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, ListVideo } from "lucide-react";
import {
  CatalogVideoCard,
  type CatalogCardVideo,
} from "./CatalogVideoCard";

interface CatalogVideoRowProps {
  title: string;
  description?: string;
  videos: CatalogCardVideo[];
  showProgress?: boolean;
  /** When set, shows a link to the ordered playlist page for this series. */
  seriesFriendlyLink?: string;
}

export function CatalogVideoRow({
  title,
  description,
  videos,
  showProgress,
  seriesFriendlyLink,
}: CatalogVideoRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (videos.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          {seriesFriendlyLink?.trim() && videos.length > 0 ?
            <Link
              to={`/catalog/series/${encodeURIComponent(seriesFriendlyLink.trim())}`}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-primary transition-colors hover:bg-primary/10"
            >
              <ListVideo className="h-4 w-4" aria-hidden />
              Playlist
            </Link>
          : null}
          <button
            type="button"
            aria-label="Scroll left"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Scroll right"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide sm:mx-0 sm:px-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {videos.map((video) => (
          <CatalogVideoCard
            key={video.id}
            video={video}
            showProgress={showProgress}
          />
        ))}
      </div>
    </section>
  );
}
