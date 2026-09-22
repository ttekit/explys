import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { CalendarDays, CalendarRange, Loader2, Target } from "lucide-react";
import { apiFetch } from "../../lib/api";
import { CatalogSidebar } from "../../components/catalog/CatalogSidebar";
import {
  CatalogVideoCard,
  type CatalogCardVideo,
} from "../../components/catalog/CatalogVideoCard";
import { ConstellationPlan } from "../../components/catalog/ConstellationPlan";
import { SEO } from "../../components/SEO/SEO";
import { resolveCanonicalUrl } from "../../lib/siteUrl";
import { cn } from "../../lib/utils";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { formatMessage } from "../../lib/formatMessage";
import {
  fetchLearnerRecapStatus,
  formatRecapCooldown,
  type LearnerRecapStatusResponse,
  type RecapKind,
  type RecapStatusItem,
} from "../../lib/learnerRecap";
import {
  fetchAllConstellations,
  fetchConstellationGraph,
  type Constellation,
  type StarProgress,
} from "../../lib/constellationApi";
import { appEn } from "../../locales/app/en";
import { appUk } from "../../locales/app/uk";


interface ContentVideo {
  id: number;
  videoName: string;
  videoDescription: string | null;
  videoLink: string;
  thumbnailUrl?: string;
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
    thumbnailUrl: video.thumbnailUrl,
    videoLink: video.videoLink,
  };
}

type RecapCardConfig = {
  kind: RecapKind;
  title: string;
  body: string;
  icon: typeof Target;
};

function RecapActionCard(props: {
  config: RecapCardConfig;
  status: RecapStatusItem | undefined;
  locale: string;
  labels: {
    start: string;
    cooldown: string;
    done: string;
    lastScore: string;
    lessons: string;
    reasons: Record<string, string>;
  };
}) {
  const { config, status, locale, labels } = props;
  const Icon = config.icon;
  const available = status?.available === true;
  const cooldown =
    !available && status?.nextAvailableAt
      ? formatRecapCooldown(status.nextAvailableAt, locale)
      : null;

  const translatedReason = status?.reason
    ? labels.reasons[status.reason] || status.reason
    : labels.done;

  const ctaLabel = available
    ? labels.start
    : status?.completedInPeriod
      ? labels.done
      : cooldown
        ? formatMessage(labels.cooldown, { time: cooldown })
        : translatedReason;

  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border bg-card/50 p-5 shadow-sm transition-colors min-w-[280px] flex-1",
        available
          ? "border-primary/30 hover:border-primary/50"
          : "border-border opacity-90",
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <h3 className="font-display text-base font-semibold tracking-tight">
          {config.title}
        </h3>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
        {config.body}
      </p>
      {status && status.lessonCount > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {formatMessage(labels.lessons, {
            count: String(status.lessonCount),
          })}
        </p>
      ) : null}
      {typeof status?.lastScorePct === "number" && status.completedInPeriod ? (
        <p className="mt-1 text-xs font-medium text-foreground">
          {formatMessage(labels.lastScore, {
            score: String(Math.round(status.lastScorePct)),
          })}
        </p>
      ) : null}
      {available ? (
        <Link
          to={`/watched-lessons/recap/${config.kind}`}
          className="flex rounded-[15px] bg-primary px-6 py-3 mt-2 text-sm font-semibold items-center justify-center text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]"
        >
          {ctaLabel}
        </Link>
      ) : (
        <p
          className="mt-4 rounded-xl border border-dashed border-border px-4 py-2.5 text-center text-sm text-muted-foreground"
          role="status"
        >
          {ctaLabel}
        </p>
      )}
    </article>
  );
}

export default function WatchedLessonsPage() {
  const { locale } = useLandingLocale();
  const dict = locale === "uk" ? appUk : appEn;

  const M = dict.myLessonsPage;
  const browseCatalog = dict.catalogSpotlight.browseCatalog;
  const reasonsDict = dict.recaps.reasons;

  const [videos, setVideos] = useState<ContentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [recapStatus, setRecapStatus] =
    useState<LearnerRecapStatusResponse | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  const [constellations, setConstellations] = useState<Constellation[]>([]);
  const [starProgressMap, setStarProgressMap] = useState<
    Record<number, StarProgress[]>
  >({});
  const [loadingPlan, setLoadingPlan] = useState(true);

  const recapCards: RecapCardConfig[] = useMemo(
    () => [
      {
        kind: "mistakes",
        title: M.workOnMistakesTitle,
        body: M.workOnMistakesBody,
        icon: Target,
      },
      {
        kind: "weekly",
        title: M.weeklySummaryTitle,
        body: M.weeklySummaryBody,
        icon: CalendarDays,
      },
      {
        kind: "monthly",
        title: M.monthlySummaryTitle,
        body: M.monthlySummaryBody,
        icon: CalendarRange,
      },
    ],
    [M],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setHasLoadError(false);
      try {
        const [watchedRes, status] = await Promise.all([
          apiFetch("/content-video/watched", { method: "GET" }),
          fetchLearnerRecapStatus(),
        ]);
        if (cancelled) return;
        if (!watchedRes.ok) {
          setHasLoadError(true);
          setVideos([]);
        } else {
          const data: unknown = await watchedRes.json();
          setVideos(Array.isArray(data) ? (data as ContentVideo[]) : []);
        }
        setRecapStatus(status);
      } catch {
        if (!cancelled) {
          setHasLoadError(true);
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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingPlan(true);
      try {
        const list = await fetchAllConstellations();
        if (cancelled) return;
        setConstellations(list);

        const progressResults = await Promise.all(
          list.map((c) => fetchConstellationGraph(c.id).catch(() => null)),
        );
        if (cancelled) return;

        const progressMap: Record<number, StarProgress[]> = {};
        progressResults.forEach((res, index) => {
          if (res) {
            const constellationId = list[index].id;
            progressMap[constellationId] = Array.isArray(res)
              ? res
              : res.stars || [];
          }
        });
        setStarProgressMap(progressMap);
      } catch {
        if (!cancelled) setConstellations([]);
      } finally {
        if (!cancelled) setLoadingPlan(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loadingPlan && constellations.length === 0) {
      const interval = setInterval(async () => {
        try {
          const list = await fetchAllConstellations();
          if (list.length > 0) {
            window.location.reload();
          }
        } catch (e) { console.log(e) }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [loadingPlan, constellations.length]);

  const cards = useMemo(() => {
    const rawCards = videos.map(toCardVideo);
    return [...rawCards].reverse();
  }, [videos]);

  const recapLabels = useMemo(
    () => ({
      start: M.recapStartCta,
      cooldown: M.recapCooldown,
      done: M.recapDonePeriod,
      lastScore: M.recapLastScore,
      lessons: M.recapLessonsHint,
      reasons: reasonsDict,
    }),
    [M, reasonsDict],
  );

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-background text-foreground antialiased">
      <SEO
        title={M.heading}
        description={M.seoDescription}
        canonicalUrl={resolveCanonicalUrl("/watched-lessons")}
        noindex
      />
      <div className="flex w-full max-w-[100vw]">
        <CatalogSidebar
          onSelectLevel={() => { }}
          reserveTopNavSpace={false}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />

        <main
          className={cn(
            "min-w-0 w-full ml-0 flex-1 pb-28 lg:pb-12 transition-all duration-300",
            sidebarCollapsed ? "lg:ml-20" : "lg:ml-64",
          )}
        >
          <div className="border-border border-b bg-card/30 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <Link to="/catalog">
                  <img
                    src={`${import.meta.env.BASE_URL}Icon.svg`}
                    className="h-18 w-15 hover:cursor-pointer shrink-0"
                    alt=""
                  />
                </Link>
                <div className="min-w-0">
                  <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl truncate">
                    {M.heading}
                  </h1>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground truncate">
                    {M.subtitle}
                  </p>
                </div>
              </div>
              <Link
                to="/catalog"
                className="text-sm font-medium text-primary hover:underline shrink-0"
              >
                {browseCatalog}
              </Link>
            </div>
          </div>

          <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 w-full">
            <section className="space-y-4 rounded-3xl border border-purple-500/20 bg-card/20 p-6 backdrop-blur-sm w-full min-w-0">
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
                  Навчальний план
                </h2>
                <p className="mt-1 text-sm text-muted-foreground break-words">
                  Ваші інтерактивні сузір'я. Натискайте на зірки, щоб проходити
                  уроки та закривати категорії.
                </p>
              </div>

              {loadingPlan ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : constellations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 px-4 border border-dashed border-border/60 rounded-2xl bg-card/10">
                  <Loader2 className="w-10 h-10 animate-spin text-purple-500 mb-4 shadow-purple-500/50" />
                  <p className="font-display font-semibold text-lg text-foreground">
                    Генеруємо ваш персональний план...
                  </p>
                  <p className="text-muted-foreground text-sm mt-2 mb-6 max-w-md text-center leading-relaxed">
                    Штучний інтелект саме зараз підбирає теми та створює унікальні сузір'я для вашого рівня. Зазвичай це займає 15-20 секунд.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600/10 text-purple-400 font-semibold text-sm hover:bg-purple-600/20 border border-purple-500/20 transition-all cursor-pointer"
                  >
                    Перевірити готовність
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 w-full min-w-0">
                  {constellations.map((c) => (
                    <ConstellationPlan
                      key={c.id}
                      constellation={c}
                      progress={starProgressMap[c.id] || []}
                      onFinishCategory={(cid) => {
                        console.log("Finished category:", cid);
                      }}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4 rounded-3xl border border-border/50 bg-card/10 p-6 w-full min-w-0">
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  {M.trainingHubTitle}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {M.trainingHubSubtitle}
                </p>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 pt-1 pr-2 custom-scrollbar w-full">
                {recapCards.map((cfg) => (
                  <RecapActionCard
                    key={cfg.kind}
                    config={cfg}
                    status={recapStatus?.[cfg.kind]}
                    locale={locale}
                    labels={recapLabels}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-4 rounded-3xl border border-border/50 bg-card/10 p-6 w-full min-w-0">
              <h2 className="font-display text-lg font-semibold tracking-tight">
                {M.completedTitle}
              </h2>
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16">
                  <Loader2
                    className="h-12 w-12 animate-spin text-primary"
                    aria-hidden
                  />
                  <p className="text-sm text-muted-foreground">{M.loading}</p>
                </div>
              ) : hasLoadError ? (
                <p className="text-destructive text-center text-sm">
                  {M.loadError}
                </p>
              ) : cards.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
                  <p className="font-medium text-foreground">{M.emptyTitle}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {M.emptyHint}
                  </p>
                  <Link
                    to="/catalog"
                    className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    {M.goToCatalog}
                  </Link>
                </div>
              ) : (
                <div className="grid grid-flow-col auto-cols-[85%] sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 sm:max-h-[600px] overflow-x-auto sm:overflow-x-hidden overflow-y-hidden sm:overflow-y-auto pb-4 sm:pb-0 pr-2 custom-scrollbar w-full min-w-0">
                  {cards.map((video) => (
                    <CatalogVideoCard
                      key={video.id}
                      video={video}
                      showProgress
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
