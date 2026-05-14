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
import { formatMessage } from "../../lib/formatMessage";
import { cn } from "../../lib/utils";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { ClipboardCheck, RotateCcw } from "lucide-react";

/** Same prefix as LessonSummaryPage / ContentPage quiz storage. */
const LESSON_SUMMARY_PREFIX = "lessonSummary:";

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

type SessionSummaryRow = {
  videoId: number;
  videoName: string;
  correctCount: number;
  totalQuestions: number;
};

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

function loadSessionSummaries(): SessionSummaryRow[] {
  if (typeof sessionStorage === "undefined") return [];
  const rows: SessionSummaryRow[] = [];
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key === null || !key.startsWith(LESSON_SUMMARY_PREFIX)) continue;
      const idStr = key.slice(LESSON_SUMMARY_PREFIX.length);
      const videoId = Number.parseInt(idStr, 10);
      if (!Number.isFinite(videoId) || videoId <= 0) continue;
      const raw = sessionStorage.getItem(key);
      if (!raw) continue;
      const p = JSON.parse(raw) as {
        correctCount?: unknown;
        totalQuestions?: unknown;
        videoName?: unknown;
      };
      const correctCount =
        typeof p.correctCount === "number" ? p.correctCount : NaN;
      const totalQuestions =
        typeof p.totalQuestions === "number" ? p.totalQuestions : NaN;
      const videoName =
        typeof p.videoName === "string" ? p.videoName.trim() : "";
      if (
        !Number.isFinite(correctCount) ||
        !Number.isFinite(totalQuestions) ||
        videoName.length < 2
      ) {
        continue;
      }
      rows.push({ videoId, videoName, correctCount, totalQuestions });
    }
  } catch {
    return [];
  }
  rows.sort((a, b) => {
    const t = `${a.videoName}`.localeCompare(`${b.videoName}`);
    return t !== 0 ? t : a.videoId - b.videoId;
  });
  return rows;
}

function mapRecommendationsToCards(data: unknown): CatalogCardVideo[] {
  if (!data || typeof data !== "object") return [];
  const rec = (data as { recommendations?: unknown }).recommendations;
  if (!Array.isArray(rec)) return [];
  const out: CatalogCardVideo[] = [];
  for (const row of rec) {
    if (!row || typeof row !== "object") continue;
    const cv = (
      row as {
        contentVideo?: {
          id?: unknown;
          videoName?: unknown;
          videoDescription?: unknown;
          videoLink?: unknown;
          thumbnailUrl?: unknown;
        };
      }
    ).contentVideo;
    const co = (
      row as {
        content?: { name?: unknown };
      }
    ).content;
    const id = typeof cv?.id === "number" ? cv.id : Number(cv?.id);
    const title =
      typeof cv?.videoName === "string" ? cv.videoName.trim() : "";
    if (!Number.isFinite(id) || id <= 0 || title.length < 2) continue;
    const categoryLabel =
      typeof co?.name === "string" && co.name.trim().length > 0
        ? co.name.trim().slice(0, 72)
        : "Pick";
    const videoLink =
      typeof cv?.videoLink === "string" ? cv.videoLink : undefined;
    const thumb =
      typeof cv?.thumbnailUrl === "string" ? cv.thumbnailUrl : undefined;
    out.push({
      id: Math.trunc(id),
      title,
      categoryLabel,
      videoLink,
      thumbnailUrl: thumb,
    });
    if (out.length >= 12) break;
  }
  return out;
}

export default function WatchedLessonsPage() {
  const { user } = useUser();
  const { messages } = useLandingLocale();
  const M = messages.myLessonsPage;
  const P = messages.profile;
  const browseCatalogLabel = messages.catalogSpotlight.browseCatalog;
  const [videos, setVideos] = useState<ContentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sessionSummaries, setSessionSummaries] = useState<SessionSummaryRow[]>(
    () => loadSessionSummaries(),
  );
  const [recommended, setRecommended] = useState<CatalogCardVideo[]>([]);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [recommendedError, setRecommendedError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setHasLoadError(false);
      try {
        const res = await apiFetch("/content-video/watched", { method: "GET" });
        if (cancelled) return;
        if (!res.ok) {
          setHasLoadError(true);
          setVideos([]);
          return;
        }
        const data: unknown = await res.json();
        setVideos(Array.isArray(data) ? (data as ContentVideo[]) : []);
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
    const onStorage = (): void => {
      setSessionSummaries(loadSessionSummaries());
    };
    window.addEventListener("storage", onStorage);
    const id = window.setInterval(onStorage, 4000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!user?.id?.trim()) {
      setRecommended([]);
      setRecommendedError(false);
      return;
    }
    let cancelled = false;
    setRecommendedLoading(true);
    setRecommendedError(false);
    void apiFetch("/content-recommendations/me")
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setRecommended([]);
          setRecommendedError(true);
          return;
        }
        const payload: unknown = await res.json();
        setRecommended(mapRecommendationsToCards(payload));
      })
      .catch(() => {
        if (!cancelled) {
          setRecommended([]);
          setRecommendedError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setRecommendedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const summaryIdSet = useMemo(
    () => new Set(sessionSummaries.map((s) => s.videoId)),
    [sessionSummaries],
  );

  const cards = useMemo(() => videos.map(toCardVideo), [videos]);
  const remediationPending =
    user?.errorFixingTestPending === true && Boolean(user?.id?.trim());

  const firstLessonId =
    videos.length > 0 && Number.isFinite(videos[0]!.id) ? videos[0]!.id : null;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <SEO
        title={M.seoTitle}
        description={M.seoDescription}
        canonicalUrl={resolveCanonicalUrl("/watched-lessons")}
        noindex
      />
      <div className="flex">
        <CatalogSidebar
          categories={[]}
          selectedCategory="All"
          onSelectCategory={() => { }}
          onSelectLevel={() => { }}
          reserveTopNavSpace={false}
          welcomeName={
            user?.name?.trim() ? user.name.trim().split(/\s+/)[0] : undefined
          }
          englishLevel={user?.englishLevel || undefined}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />

        <main
          className={cn(
            "ml-0 flex-1 pb-28 lg:pb-12",
            sidebarCollapsed ? "lg:ml-20" : "lg:ml-64",
          )}
        >
          <div className="border-border border-b bg-card/30 px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-start gap-3">
                <ChameleonMascot size="sm" mood="happy" animate={false} />
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                    {M.heading}
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                    {M.subtitle}
                  </p>
                </div>
              </div>
              <Link
                to="/catalog"
                className="text-sm font-medium text-primary hover:underline"
              >
                {browseCatalogLabel}
              </Link>
            </div>
          </div>

          <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
            <section
              className="space-y-4"
              aria-labelledby="my-lessons-training-heading"
            >
              <h2
                id="my-lessons-training-heading"
                className="font-display text-lg font-semibold tracking-tight"
              >
                {M.trainingHubTitle}
              </h2>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/15 p-2 text-primary">
                      <ClipboardCheck className="h-5 w-5 shrink-0" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="font-display text-base font-semibold tracking-tight">
                        {M.sectionPracticeTitle}
                      </h3>
                      {remediationPending ?
                        <>
                          <p className="inline-flex rounded-full bg-accent/25 px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
                            {M.practicePendingBadge}
                          </p>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {M.practicePendingBody}
                          </p>
                        </>
                      : <p className="text-sm leading-relaxed text-muted-foreground">
                          {M.practiceNeutralBody}
                        </p>}
                      {!loading && Boolean(user?.id?.trim()) && firstLessonId !== null ?
                        <Link
                          to={`/content/${firstLessonId}`}
                          className="inline-flex text-sm font-semibold text-primary hover:underline"
                        >
                          {M.practiceOpenLesson}
                          {" →"}
                        </Link>
                      : null}
                    </div>
                  </div>
                  {!user?.id?.trim() ?
                    <p className="text-xs text-muted-foreground">
                      {M.practiceSignInHint}{" "}
                      <Link
                        to="/loginForm"
                        className="font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        {P.goToLogin}
                      </Link>
                    </p>
                  : null}
                </div>
                <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card/50 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/15 p-2 text-primary">
                      <RotateCcw className="h-5 w-5 shrink-0" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <h3 className="font-display text-base font-semibold tracking-tight">
                        {M.rerunTestTitle}
                      </h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {M.rerunTestBody}
                      </p>
                    </div>
                  </div>
                  {user?.id?.trim() ?
                    <Link
                      to="/profile/weekly-review?rerun=1"
                      className="mt-auto inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
                    >
                      {M.rerunTestCta}
                    </Link>
                  : (
                    <>
                      <p className="text-xs text-muted-foreground">{M.practiceSignInHint}</p>
                      <Link
                        to="/loginForm"
                        className="mt-auto inline-flex w-full items-center justify-center rounded-xl border border-primary/40 bg-transparent px-4 py-2.5 text-center text-sm font-semibold text-primary transition-colors hover:bg-muted/80 sm:w-auto"
                      >
                        {P.goToLogin}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  {M.completedTitle}
                </h2>
              </div>
              {loading ?
                <div className="flex flex-col items-center gap-3 py-12">
                  <div
                    className="border-muted h-12 w-12 animate-spin rounded-full border-4 border-t-primary border-solid"
                    aria-hidden
                  />
                  <p className="text-sm text-muted-foreground">{M.loading}</p>
                </div>
              : hasLoadError ?
                <p className="text-destructive text-sm">{M.loadError}</p>
              : cards.length === 0 ?
                <div className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
                  <p className="font-medium text-foreground">{M.emptyTitle}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{M.emptyHint}</p>
                  <Link
                    to="/catalog"
                    className="mt-6 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    {M.goToCatalog}
                  </Link>
                </div>
              : <div className="flex flex-wrap gap-x-8 gap-y-12">
                  {videos.map((v) => (
                    <div key={v.id} className="flex max-w-[300px] flex-col gap-2">
                      <CatalogVideoCard
                        video={toCardVideo(v)}
                        showProgress
                      />
                      {summaryIdSet.has(v.id) ?
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-1">
                          <Link
                            className="text-sm font-semibold text-primary hover:underline"
                            to={`/content/${v.id}/summary`}
                          >
                            {M.viewSummaryLink}
                          </Link>
                        </div>
                      : null}
                    </div>
                  ))}
                </div>
              }
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  {M.summariesTitle}
                </h2>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  {M.summariesSubtitle}
                </p>
              </div>
              {sessionSummaries.length === 0 ?
                <p className="text-sm text-muted-foreground">{M.summariesEmpty}</p>
              : <ul className="divide-y divide-border rounded-2xl border border-border bg-card/40">
                  {sessionSummaries.map((row) => (
                    <li
                      key={row.videoId}
                      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm sm:px-5"
                    >
                      <Link
                        to={`/content/${row.videoId}/summary`}
                        className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        {row.videoName}
                      </Link>
                      <span className="text-muted-foreground">
                        {formatMessage(M.scoreChip, {
                          correct: String(row.correctCount),
                          total: String(row.totalQuestions),
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              }
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  {M.suggestedTitle}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {M.suggestedSubtitle}
                </p>
              </div>
              {!user?.id ?
                <p className="text-sm text-muted-foreground">
                  {M.suggestedEmpty}
                </p>
              : recommendedLoading ?
                <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
                  <div
                    className="border-muted h-9 w-9 animate-spin rounded-full border-2 border-t-primary border-solid"
                    aria-hidden
                  />
                  {M.loading}
                </div>
              : recommendedError ?
                <p className="text-sm text-destructive">{M.suggestedLoadError}</p>
              : recommended.length === 0 ?
                <p className="text-sm text-muted-foreground">{M.suggestedEmpty}</p>
              : <div className="flex flex-wrap gap-x-8 gap-y-10">
                  {recommended.map((v) => (
                    <CatalogVideoCard key={v.id} video={v} />
                  ))}
                </div>
              }
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
