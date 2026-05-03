import { useNavigate } from "react-router";
import { Info, Play, Star } from "lucide-react";

export interface CatalogHeroVideo {
  id: number;
  title: string;
  description: string;
  categoryName: string;
}

interface CatalogHeroProps {
  featured: CatalogHeroVideo | null;
}

export function CatalogHero({ featured }: CatalogHeroProps) {
  const navigate = useNavigate();

  return (
    <section className="relative flex min-h-[500px] h-[70vh] items-end overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_oklch(0.65_0.25_295_/_0.3)_0%,_transparent_50%)]" />
      <div className="absolute inset-0 bg-card/60" />

      <div className="relative max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-primary/20 px-3 py-1 text-sm font-medium text-primary">
            Featured
          </span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="h-4 w-4 fill-accent text-accent" />
            4.9
          </span>
          {featured ? (
            <span className="text-sm text-muted-foreground">
              {featured.categoryName}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Browse below</span>
          )}
        </div>

        <h1 className="font-display mb-4 text-balance text-4xl font-bold sm:text-5xl lg:text-6xl">
          {featured
            ? featured.title
            : "Your English catalog"}
        </h1>

        <p className="mb-8 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {featured
            ? featured.description
            : "Pick a lane and learn from curated video clips. Content updates as your library grows."}
        </p>

        <div className="mb-8 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>Fresh picks</span>
          <span className="flex h-1 w-1 items-center justify-center">
            <span className="h-1 w-1 rounded-full bg-muted-foreground" />
          </span>
          <span>Video + quizzes</span>
          <span className="flex h-1 w-1 items-center justify-center">
            <span className="h-1 w-1 rounded-full bg-muted-foreground" />
          </span>
          <span>Levels for every learner</span>
        </div>

        <div className="flex flex-wrap gap-4">
          <button
            type="button"
            disabled={!featured}
            onClick={() => featured && navigate(`/content/${featured.id}`)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
          >
            <Play className="h-5 w-5 fill-current" />
            Start Watching
          </button>
          <button
            type="button"
            onClick={() => {
              document.getElementById("catalog-library")?.scrollIntoView({
                behavior: "smooth",
              });
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-8 py-3 text-sm font-semibold transition-colors hover:bg-muted"
          >
            <Info className="h-5 w-5" />
            Browse library
          </button>
        </div>
      </div>
    </section>
  );
}
