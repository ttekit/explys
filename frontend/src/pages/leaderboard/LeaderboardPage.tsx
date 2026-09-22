import { useEffect, useState } from "react";
import { Crown, Loader2, Medal, Trophy } from "lucide-react";
import { CatalogSidebar } from "../../components/catalog/CatalogSidebar";
import { SEO } from "../../components/SEO/SEO";
import { resolveCanonicalUrl } from "../../lib/siteUrl";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { useAppMessages } from "../../hooks/useAppMessages";
import { formatMessage } from "../../lib/formatMessage";
import {
  fetchLeaderboard,
  type LeaderboardEntry,
  type LeaderboardResponse,
} from "../../lib/leaderboard";
import { cn } from "../../lib/utils";

function rank_icon(rank: number) {
  if (rank === 1) {
    return <Crown className="size-5 text-amber-400" aria-hidden />;
  }
  if (rank === 2) {
    return <Medal className="size-5 text-slate-300" aria-hidden />;
  }
  if (rank === 3) {
    return <Medal className="size-5 text-amber-700" aria-hidden />;
  }
  return (
    <span className="inline-flex size-5 items-center justify-center text-sm font-semibold text-muted-foreground">
      {rank}
    </span>
  );
}

function LeaderboardRow({
  entry,
  videosLabel,
  levelLabel,
}: {
  entry: LeaderboardEntry;
  videosLabel: string;
  levelLabel: string;
}) {
  const displayLevel = entry.englishLevel?.trim() || levelLabel;
  return (
    <li
      className={cn(
        "flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors",
        entry.isCurrentUser
          ? "border-primary/50 bg-primary/10"
          : "border-border/50 bg-card/40",
      )}
    >
      <div className="flex w-8 shrink-0 justify-center">{rank_icon(entry.rank)}</div>
      <img
        src={entry.avatarUrl || `${import.meta.env.BASE_URL}LandingProfile.svg`}
        alt=""
        className="size-10 shrink-0 rounded-full border border-border/60 object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{entry.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatMessage(videosLabel, {
            count: String(entry.highScoreVideoCount),
          })}
        </p>
      </div>
      <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
        {displayLevel}
      </span>
    </li>
  );
}

export default function LeaderboardPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { locale } = useLandingLocale();
  const page = useAppMessages().leaderboardPage;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const response = await fetchLeaderboard();
      if (!cancelled) {
        setData(response);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen overflow-x-clip bg-background text-foreground antialiased">
      <SEO
        title={page.seoTitle}
        description={page.seoDescription}
        canonicalUrl={resolveCanonicalUrl("/leaderboard")}
        ogLocale={locale === "uk" ? "uk_UA" : "en_US"}
        ogLocaleAlternate={locale === "uk" ? "en_US" : "uk_UA"}
        noindex
      />
      <CatalogSidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        reserveTopNavSpace={false}
      />
      <main
        className={cn(
          "flex min-h-screen flex-1 flex-col px-4 pb-24 pt-6 transition-all duration-300 lg:pb-8 lg:pt-8",
          sidebarCollapsed ? "lg:pl-20" : "lg:pl-64",
        )}
      >
        <header className="mx-auto mb-6 w-full max-w-3xl">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/15 p-3 text-primary">
              <Trophy className="size-6" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{page.title}</h1>
              <p className="text-sm text-muted-foreground">
                {formatMessage(page.lead, {
                  minScore: String(data?.minScorePct ?? 80),
                })}
              </p>
            </div>
          </div>
          {data && data.currentUserRank != null ? (
            <p className="mt-4 rounded-xl border border-border/50 bg-card/50 px-4 py-3 text-sm">
              {formatMessage(page.yourRank, {
                rank: String(data.currentUserRank),
                count: String(data.currentUserHighScoreVideoCount),
              })}
            </p>
          ) : null}
        </header>

        <section className="mx-auto w-full max-w-3xl">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" aria-hidden />
              <span>{page.loading}</span>
            </div>
          ) : !data || data.entries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 px-6 py-12 text-center text-muted-foreground">
              {page.empty}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.entries.map((entry) => (
                <LeaderboardRow
                  key={entry.userId}
                  entry={entry}
                  videosLabel={page.videosCount}
                  levelLabel={page.levelUnknown}
                />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
