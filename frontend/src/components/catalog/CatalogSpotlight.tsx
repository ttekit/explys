import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  Clapperboard,
  Search,
  X,
} from "lucide-react";
import { cn } from "../../lib/utils";

export type CatalogSpotlightItem = {
  id: number;
  title: string;
  category: string;
  description: string | null;
  thumbnailUrl?: string;
  videoLink?: string;
};

type CatalogSpotlightProps = {
  open: boolean;
  onClose: () => void;
  videos: CatalogSpotlightItem[];
};

function normalizeHaystack(v: CatalogSpotlightItem): string {
  const d = (v.description ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  return [v.title, v.category, d].join(" ").toLowerCase();
}

export function CatalogSpotlight({
  open,
  onClose,
  videos,
}: CatalogSpotlightProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q.length) {
      return videos.slice(0, 24);
    }
    const needle = q;
    const scored = videos.filter((v) =>
      normalizeHaystack(v).includes(needle),
    );
    return scored.slice(0, 50);
  }, [query, videos]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    setActiveIndex((i) => Math.min(i, Math.max(0, results.length - 1)));
  }, [results.length]);

  useEffect(() => {
    if (!open) return;
    const row = listRef.current?.querySelector?.(
      `[data-spotlight-index="${activeIndex}"]`,
    );
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex, open]);

  const goLesson = useCallback(
    (id: number) => {
      navigate(`/content/${id}`);
      onClose();
    },
    [navigate, onClose],
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onClose();
        return;
      }
      const len = results.length;
      if (len === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(len - 1, i + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      }
      if (e.key === "Enter" && len > 0 && results[Math.min(activeIndex, len - 1)]) {
        e.preventDefault();
        goLesson(results[Math.min(activeIndex, len - 1)].id);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, activeIndex, results, onClose, goLesson]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const shortcutLabel =
    typeof navigator !== "undefined" &&
    navigator.platform.includes("Mac")
      ? "⌘K"
      : "Ctrl+K";

  return (
    <div
      className="fixed inset-0 z-[140] flex justify-center px-4 pt-[10vh] sm:pt-[14vh]"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Dismiss search"
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-md transition-opacity duration-150"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      />

      <div
        className="relative z-[141] h-fit w-full max-w-2xl rounded-2xl border border-border shadow-[0_0_0_1px_oklch(0.65_0.25_295/0.12),0_28px_90px_oklch(0_0_0/0.55)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-spotlight-title"
      >
        <div
          className={cn(
            "overflow-hidden rounded-2xl bg-card/95 backdrop-blur-2xl font-display",
          )}
        >
            <div className="relative border-border border-b">
              <Search
                className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-primary/70"
                aria-hidden
              />
              <label htmlFor="catalog-spotlight-input" id="catalog-spotlight-title" className="sr-only">
                Search lessons
              </label>
              <input
                id="catalog-spotlight-input"
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                placeholder="Search lessons…"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className={cn(
                  "w-full border-0 bg-transparent py-5 pr-28 pl-14 text-lg text-foreground",
                  "placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-0",
                  "font-display tracking-tight",
                )}
              />
              <button
                type="button"
                className="absolute top-1/2 right-3 flex items-center gap-2 -translate-y-1/2 rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
                onClick={() => onClose()}
              >
                <span className="hidden sm:inline">Esc</span>
                <span className="sm:hidden">
                  <X className="size-3.5" />
                </span>
              </button>
            </div>

            <div className="px-4 py-2">
              <p className="text-muted-foreground text-xs uppercase tracking-wide">
                {query.trim().length ? "Matching lessons" : "Browse catalog"}
              </p>
            </div>

            <div
              ref={listRef}
              className="max-h-[min(420px,calc(100dvh-220px))] overflow-y-auto border-border border-t"
            >
              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                  <Clapperboard className="size-10 text-muted-foreground/50" aria-hidden />
                  <p className="text-muted-foreground text-sm">
                    {videos.length === 0
                      ? "No lessons in the catalog yet."
                      : query.trim().length
                        ? `No matches for "${query.trim()}"`
                        : "Start typing to find a lesson"}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/80 pb-3">
                  {results.map((v, idx) => {
                    const sel = idx === activeIndex;
                    return (
                      <li key={v.id}>
                        <button
                          type="button"
                          data-spotlight-index={idx}
                          role="option"
                          aria-selected={sel}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => goLesson(v.id)}
                          className={cn(
                            "flex w-full items-center gap-4 px-4 py-3 text-left transition-colors",
                            sel
                              ? "bg-primary/12 text-foreground ring-2 ring-ring/40 ring-inset"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                          )}
                        >
                          <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                            {v.thumbnailUrl ? (
                              <img
                                src={v.thumbnailUrl}
                                alt=""
                                className="absolute inset-0 size-full object-cover"
                              />
                            ) : v.videoLink ? (
                              <video
                                src={`${v.videoLink}#t=0.1`}
                                preload="metadata"
                                muted
                                playsInline
                                className="absolute inset-0 size-full object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-linear-to-br from-primary/25 to-accent/10" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-base text-foreground">
                              {v.title}
                            </p>
                            <p className="mt-0.5 truncate text-sm text-accent">
                              {v.category}
                            </p>
                          </div>
                          <ArrowRight
                            className={cn(
                              "size-5 shrink-0 opacity-0 transition-opacity",
                              sel && "text-primary opacity-100",
                            )}
                            aria-hidden
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-border border-t px-5 py-3 text-muted-foreground text-xs">
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                <span>
                  <kbd className="rounded border border-border bg-muted/80 px-1.5 py-0.5 font-sans shadow-sm">
                    ↑
                  </kbd>{" "}
                  <kbd className="rounded border border-border bg-muted/80 px-1.5 py-0.5 font-sans shadow-sm">
                    ↓
                  </kbd>{" "}
                  Navigate
                </span>
                <span>
                  <kbd className="rounded border border-border bg-muted/80 px-2 py-0.5 font-sans shadow-sm">
                    Enter
                  </kbd>{" "}
                  Open
                </span>
              </span>
              <span>
                Toggle with{" "}
                <kbd className="rounded border border-border bg-muted/80 px-2 py-0.5 font-sans shadow-sm">
                  {shortcutLabel}
                </kbd>
              </span>
            </div>
          </div>
        </div>
    </div>
  );
}
