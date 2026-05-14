import { Link } from "react-router";
import { Clock, Play } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CatalogCardVideo {
  id: number;
  title: string;
  categoryLabel: string;
  durationLabel?: string;
  progress?: number;
  thumbnailUrl?: string;
  videoLink?: string;
}

const levelLike = /^(A1|A2|B1|B2|C1|C2)$/i;

const badgeClassForLabel = (label: string) => {
  const t = label.trim().toUpperCase();
  if (levelLike.test(t)) {
    const map: Record<string, string> = {
      A1: "bg-accent text-accent-foreground",
      A2: "bg-accent text-accent-foreground",
      B1: "bg-primary/80 text-primary-foreground",
      B2: "bg-primary text-primary-foreground",
      C1: "bg-destructive/80 text-destructive-foreground",
      C2: "bg-destructive text-destructive-foreground",
    };
    return map[t] ?? "bg-muted text-muted-foreground";
  }
  return "bg-primary/20 text-primary";
};

interface CatalogVideoCardProps {
  video: CatalogCardVideo;
  showProgress?: boolean;
}

export function CatalogVideoCard({ video, showProgress }: CatalogVideoCardProps) {
  return (
    <Link
      to={`/content/${video.id}`}
      className="group w-[280px] shrink-0 sm:w-[300px]"
    >
      <div className="relative mb-3 aspect-video overflow-hidden rounded-xl bg-muted">
        {video.thumbnailUrl ? (
          <img 
            src={video.thumbnailUrl} 
            alt={video.title} 
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" 
          />
        ) : video.videoLink ? (
          <video 
            src={`${video.videoLink}#t=0.1`} 
            preload="metadata" 
            crossOrigin="anonymous"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            muted 
            playsInline 
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-muted to-accent/20" />
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background/40 backdrop-blur-sm">
            <Play className="h-6 w-6 fill-foreground text-foreground" />
          </div>
        </div>

        <span
          className={cn(
            "absolute top-2 left-2 rounded px-2 py-0.5 text-xs font-medium z-10",
            badgeClassForLabel(video.categoryLabel),
          )}
        >
          {video.categoryLabel}
        </span>

        {video.durationLabel ? (
          <span className="absolute right-2 bottom-2 flex items-center gap-1 rounded bg-background/80 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur-sm z-10">
            <Clock className="h-3 w-3" />
            {video.durationLabel}
          </span>
        ) : null}

        {showProgress && video.progress !== undefined ? (
          <div className="absolute right-0 bottom-0 left-0 h-1 bg-muted z-10">
            <div
              className="h-full bg-primary"
              style={{ width: `${video.progress}%` }}
            />
          </div>
        ) : null}
      </div>

      <h3 className="line-clamp-2 font-medium text-foreground transition-colors group-hover:text-primary">
        {video.title}
      </h3>

      {showProgress && video.progress !== undefined ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {video.progress}% watched
        </p>
      ) : null}
    </Link>
  );
}