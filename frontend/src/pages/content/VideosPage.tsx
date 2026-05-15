import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  apiFetch,
  getApiBase,
  getResponseErrorMessage,
  getStoredAccessToken,
} from "../../lib/api";
import { useUser } from "../../context/UserContext";
import {
  subscriptionEnforcementDisabled,
  userMayUseLearnerApp,
} from "../../lib/subscriptionAccess";
import PlacementPreferencesStep from "../../components/PlacementPreferencesStep";
import PlacementPreTestStep, {
  adultNeedsPlacementPrepFields,
  studentNeedsPlacementPreferencesOverlay,
} from "../../components/PlacementPreTestStep";
import { SEO } from "../../components/SEO/SEO";
import { resolveCanonicalUrl } from "../../lib/siteUrl";
import { formatMessage } from "../../lib/formatMessage";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { CatalogHero } from "../../components/catalog/CatalogHero";
import { CatalogSidebar } from "../../components/catalog/CatalogSidebar";
import { CatalogVideoRow } from "../../components/catalog/CatalogVideoRow";
import {
  CatalogSpotlight,
  type CatalogSpotlightItem,
} from "../../components/catalog/CatalogSpotlight";
import type { CatalogCardVideo } from "../../components/catalog/CatalogVideoCard";
import { cn } from "../../lib/utils";
import { Frown } from "lucide-react";
import toast from "react-hot-toast";

interface ContentVideo {
  id: number;
  videoName: string;
  videoDescription: string | null;
  videoLink: string;
  thumbnailUrl?: string;
  playlistPosition?: number;
  content: {
    id: number;
    playlistPosition?: number;
    category: {
      id: number;
      name: string;
      description: string;
      friendlyLink: string;
    };
  };
}

function toCardVideo(video: ContentVideo): CatalogCardVideo {
  return {
    id: video.id,
    title: video.videoName,
    categoryLabel: video.content.category.name,
    thumbnailUrl: video.thumbnailUrl,
    videoLink: video.videoLink,
  };
}


/** Ensure API origin in srcDoc HTML matches the SPA client (avoids broken inline script / proxy host skew). */
function placementPatchApiOrigin(html: string, apiOrigin: string): string {
  const trimmed = apiOrigin.replace(/\/$/, "");
  const esc = trimmed.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return html.replace(
    /<meta\s+name="explys-placement-api-origin"\s+content="[^"]*"\s*\/?\s*>/i,
    `<meta name="explys-placement-api-origin" content="${esc}" />`,
  );
}

/** Toast id avoids duplicate banners if the effect runs twice (e.g. React Strict Mode). */
const STRIPE_CHECKOUT_CATALOG_TOAST_ID = "stripe-checkout-catalog-welcome";

function stripCheckoutSuccessSearch(): { pathname: string; search: string } {
  const pathname = window.location.pathname;
  const p = new URLSearchParams(window.location.search);
  if (p.get("checkout") !== "success") {
    return { pathname, search: window.location.search };
  }
  p.delete("checkout");
  const q = p.toString();
  return { pathname, search: q ? `?${q}` : "" };
}

export default function VideoPage() {
  const [videos, setVideos] = useState<ContentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // icon-only rail until expanded
  const [placementDocHtml, setPlacementDocHtml] = useState<string | null>(null);
  const [placementDocError, setPlacementDocError] = useState<string | null>(
    null,
  );
  const navigate = useNavigate();
  const location = useLocation();
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const { user, isLoading: userLoading, refreshProfile } = useUser();
  const { messages, locale } = useLandingLocale();
  const catalogSeo = messages.catalogPage;
  const placementCompleteHandled = useRef(false);

  const catalogCheckoutReturn = useMemo(() => {
    return new URLSearchParams(location.search).get("checkout") === "success";
  }, [location.search]);

  const activatingSubscriptionOverlay =
    catalogCheckoutReturn &&
    !subscriptionEnforcementDisabled() &&
    !!user &&
    !userMayUseLearnerApp(user);

  useEffect(() => {
    if (!catalogCheckoutReturn) return;

    let cancelled = false;

    void (async () => {
      const maxAttempts = 24;
      for (let i = 0; i < maxAttempts; i++) {
        if (cancelled) return;
        const profile = await refreshProfile();
        if (cancelled) return;
        if (profile && userMayUseLearnerApp(profile)) {
          const { pathname, search } = stripCheckoutSuccessSearch();
          void navigate({ pathname, search }, { replace: true });
          if (!import.meta.env.DEV) {
            toast.success(messages.catalogBrowse.stripeThanksToast, {
              id: STRIPE_CHECKOUT_CATALOG_TOAST_ID,
              duration: 6000,
            });
          }
          return;
        }
        await new Promise((r) => setTimeout(r, 500));
      }
      if (!cancelled) {
        const { pathname, search } = stripCheckoutSuccessSearch();
        void navigate({ pathname, search }, { replace: true });
        if (!import.meta.env.DEV) {
          toast.error(
            messages.catalogBrowse.stripeConfirmError,
            { duration: 8000, id: `${STRIPE_CHECKOUT_CATALOG_TOAST_ID}-err` },
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [catalogCheckoutReturn, navigate, refreshProfile]);

  const accessToken = getStoredAccessToken();
  const needsPlacement =
    !userLoading &&
    !!accessToken &&
    !!user &&
    user.role !== "teacher" &&
    user.role !== "admin" &&
    !user.hasCompletedPlacement;

  /** Derive phase synchronously so we never flash the wrong overlay (effect + stale initial state). */
  const placementPhaseResolved = useMemo((): "preferences" | "test" | "off" => {
    if (!needsPlacement || !user) return "off";
    if (user.role === "adult") {
      return adultNeedsPlacementPrepFields(user) ? "preferences" : "test";
    }
    if (user.role === "student") {
      return studentNeedsPlacementPreferencesOverlay(user)
        ? "preferences"
        : "test";
    }
    const hasPrefs =
      (user.hobbies?.length ?? 0) > 0 &&
      (user.favoriteGenres?.length ?? 0) > 0;
    return hasPrefs ? "test" : "preferences";
  }, [
    needsPlacement,
    user,
    user?.hobbies,
    user?.favoriteGenres,
    user?.role,
    user?.teacherId,
    user?.nativeLanguage,
    user?.workField,
    user?.education,
    user?.englishLevel,
  ]);

  const showPlacementPrepOverlay =
    placementPhaseResolved === "preferences" && !!user;
  const showPlacementTest = placementPhaseResolved === "test" && !!accessToken;

  useEffect(() => {
    if (!needsPlacement) {
      placementCompleteHandled.current = false;
      return;
    }
    const onMessage = (ev: MessageEvent) => {
      if (ev.data?.type === "placement_exit") {
        navigate("/");
        return;
      }
      if (
        ev.data?.type === "placement_test_complete" &&
        !placementCompleteHandled.current
      ) {
        placementCompleteHandled.current = true;
        void (async () => {
          await refreshProfile();
          navigate("/learning-plan", { replace: true });
        })();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [needsPlacement, navigate, refreshProfile]);

  useEffect(() => {
    if (!showPlacementTest || !accessToken) {
      setPlacementDocHtml(null);
      setPlacementDocError(null);
      return;
    }
    let cancelled = false;
    setPlacementDocHtml(null);
    setPlacementDocError(null);
    void (async () => {
      try {
        const res = await apiFetch("/placement-test/document", {
          method: "GET",
        });
        if (!res.ok) {
          const msg = await getResponseErrorMessage(res);
          if (!cancelled) setPlacementDocError(msg);
          return;
        }
        const html = await res.text();
        if (!cancelled) {
          setPlacementDocHtml(
            placementPatchApiOrigin(html, getApiBase().replace(/\/$/, "")),
          );
          setPlacementDocError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setPlacementDocError(
            e instanceof Error ? e.message : messages.catalogBrowse.placementLoadError,
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showPlacementTest, accessToken]);

  useEffect(() => {
    try {
      if (typeof console !== "undefined" && console.log) {
        console.log("[placement:parent]", "placement state", {
          placementPhaseResolved,
          showPlacementTest,
          showPlacementPrepOverlay,
          needsPlacement,
          hasToken: !!accessToken,
          hasUser: !!user,
          userRole: user?.role,
          hasCompletedPlacement: user?.hasCompletedPlacement,
          apiBase: getApiBase(),
        });
      }
    } catch {
      /* */
    }
  }, [
    placementPhaseResolved,
    showPlacementTest,
    showPlacementPrepOverlay,
    needsPlacement,
    accessToken,
    user,
  ]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await apiFetch("/content-video", { method: "GET" });
        if (response.ok) setVideos(await response.json());
      } catch (error) {
        console.error("Error fetching video library:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  /** Open Spotlight from sidebar on other routes via Link `state.openSpotlight` */
  useEffect(() => {
    const raw = location.state as { openSpotlight?: boolean } | null | undefined;
    if (raw?.openSpotlight) {
      setSpotlightOpen(true);
      void navigate(
        {
          pathname: location.pathname,
          search: location.search,
        },
        { replace: true, state: {} },
      );
    }
  }, [location.state, location.pathname, location.search, navigate]);

  /** Cmd/Ctrl + K opens Spotlight from catalog shell (closing handled inside Spotlight modal) */
  useEffect(() => {
    if (needsPlacement || showPlacementPrepOverlay || showPlacementTest) return;
    if (spotlightOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      if (e.key.toLowerCase() !== "k") return;
      const t = e.target as HTMLElement | null;
      const inField = t?.closest?.(
        "input, textarea, select, [contenteditable]",
      );
      if (inField) return;
      e.preventDefault();
      setSpotlightOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    needsPlacement,
    showPlacementPrepOverlay,
    showPlacementTest,
    spotlightOpen,
  ]);

  const spotlightVideos: CatalogSpotlightItem[] = useMemo(() => {
    return videos.map((v) => ({
      id: v.id,
      title: v.videoName,
      category: v.content.category.name,
      description: v.videoDescription ?? null,
      thumbnailUrl: v.thumbnailUrl,
      videoLink: v.videoLink,
    }));
  }, [videos]);

  const categoryNames = useMemo(() => {
    const names = videos.map((v) => v.content.category.name);
    return [...new Set(names)];
  }, [videos]);

  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (selectedCategory === "All") return true;
      return v.content.category.name === selectedCategory;
    });
  }, [videos, selectedCategory]);

  const featured = filteredVideos[0] ?? null;
  const featuredHero = featured
    ? {
      id: featured.id,
      title: featured.videoName,
      description:
        featured.videoDescription ??
        featured.content.category.description ??
        "",
      categoryName: featured.content.category.name,
    }
    : null;

  const catalogRows = useMemo(() => {
    if (filteredVideos.length === 0) return [];
    if (selectedCategory !== "All") {
      const sorted = [...filteredVideos].sort((a, b) => {
        const ma =
          typeof a.content.playlistPosition === "number" ?
            a.content.playlistPosition
            : 0;
        const mb =
          typeof b.content.playlistPosition === "number" ?
            b.content.playlistPosition
            : 0;
        if (ma !== mb) return ma - mb;
        const va =
          typeof a.playlistPosition === "number" ? a.playlistPosition : 0;
        const vb =
          typeof b.playlistPosition === "number" ? b.playlistPosition : 0;
        if (va !== vb) return va - vb;
        return a.id - b.id;
      });
      const link = sorted[0]?.content.category.friendlyLink?.trim() ?? "";
      return [
        {
          title: selectedCategory,
          description: undefined as string | undefined,
          seriesFriendlyLink: link.length > 0 ? link : undefined,
          videos: sorted.map(toCardVideo),
        },
      ];
    }
    const byCategory = new Map<string, ContentVideo[]>();
    for (const v of filteredVideos) {
      const key = v.content.category.name;
      const bucket = byCategory.get(key);
      if (bucket) bucket.push(v);
      else byCategory.set(key, [v]);
    }
    return [...byCategory.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([title, list]) => {
        const sorted = [...list].sort((a, b) => {
          const ma =
            typeof a.content.playlistPosition === "number" ?
              a.content.playlistPosition
              : 0;
          const mb =
            typeof b.content.playlistPosition === "number" ?
              b.content.playlistPosition
              : 0;
          if (ma !== mb) return ma - mb;
          const va =
            typeof a.playlistPosition === "number" ? a.playlistPosition : 0;
          const vb =
            typeof b.playlistPosition === "number" ? b.playlistPosition : 0;
          if (va !== vb) return va - vb;
          return a.id - b.id;
        });
        const link = sorted[0]?.content.category.friendlyLink?.trim() ?? "";
        return {
          title,
          description: undefined as string | undefined,
          seriesFriendlyLink: link.length > 0 ? link : undefined,
          videos: sorted.map(toCardVideo),
        };
      });
  }, [filteredVideos, selectedCategory]);

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex-col">
      {activatingSubscriptionOverlay ?
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
          <p className="text-muted-foreground text-sm">
            {messages.catalogBrowse.activatingSubscription}
          </p>
        </div>
      : null}
      <SEO
        title={catalogSeo.title}
        description={catalogSeo.description}
        canonicalUrl={resolveCanonicalUrl("/catalog")}
        ogLocale={locale === "uk" ? "uk_UA" : "en_US"}
        ogLocaleAlternate={locale === "uk" ? "en_US" : "uk_UA"}
      />
      <div>
        <div className="flex">
          <CatalogSidebar
            categories={categoryNames}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            onSelectLevel={() => {}}
            welcomeName={user?.name ? user.name.split(" ")[0] : undefined}
            englishLevel={user?.englishLevel || undefined}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
            catalogSpotlightOpen={spotlightOpen}
            onOpenCatalogSpotlight={() => setSpotlightOpen(true)}
          />

          <main
            className={cn(
              "flex-1 pb-24 transition-all duration-300 font-display lg:pb-8",
              sidebarCollapsed ? "lg:ml-20" : "lg:ml-64",
            )}
          >
            <CatalogHero featured={featuredHero} />
            <div id="catalog-library" className="space-y-10">
              {loading ? (
                <div className="flex h-60 bg-card/30 flex-col items-center border-border border-t justify-center space-y-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-solid border-primary border-t-4 border-r-transparent border-b-transparent border-l-transparent" />
                  <p className="animate-pulse text-muted-foreground">
                    {messages.catalogBrowse.loadingCatalog}
                  </p>
                </div>
              ) : filteredVideos.length === 0 ? (
                <div className="border-t border-border bg-card/30 py-15 text-center">
                  <Frown className="text-foreground/70 justify-center w-full w-10 h-10 pb-2" />
                  <h2 className="font-display text-2xl font-bold">
                    {messages.catalogBrowse.emptyTitle}
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    {videos.length === 0
                      ? messages.catalogBrowse.emptyNoVideos
                      : messages.catalogBrowse.emptyFiltered}
                  </p>
                </div>
              ) : (
                catalogRows.map((row) => (
                  <CatalogVideoRow
                    key={row.title}
                    title={row.title}
                    description={row.description}
                    seriesFriendlyLink={row.seriesFriendlyLink}
                    videos={row.videos}
                  />
                ))
              )}
            </div>
          </main>
        </div>
      </div>

      {showPlacementPrepOverlay ? (
        <div className="fixed inset-0 z-200 font-display flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
          <header className="shrink-0 border-border border-b bg-background">
            <div className="mx-auto grid w-full max-w-4xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4">
              <div aria-hidden="true" />
              <div className="flex items-center gap-2">
                <img src="/Icon.svg" className="w-10 h-13" />
                <span className="font-display text-lg font-bold tracking-tight text-foreground">
                  Explys
                </span>
              </div>
              <span className="justify-self-end text-sm text-muted-foreground">
                {messages.catalogBrowse.placementStepCounter}
              </span>
            </div>
          </header>
          <div className="mx-auto w-full max-w-4xl shrink-0 px-4 py-6">
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={50}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={messages.catalogBrowse.placementProgressAria}
            >
              <div className="h-full w-1/2 rounded-full bg-primary transition-all" />
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="mx-auto mb-4 w-full max-w-2xl flex flex-col min-h-0 bg-card border border-border rounded-3xl overflow-scroll">
              <div className="mx-auto w-full max-w-md shrink-0 px-4 pt-2 pb-2">
                <h2 className="font-display text-xl font-semibold mt-1 tracking-tight text-foreground">
                  {messages.catalogBrowse.beforeEntryTitle}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {user?.role === "adult"
                    ? messages.catalogBrowse.beforeEntryAdult
                    : user?.role === "student" && user?.teacherId == null
                      ? messages.catalogBrowse.beforeEntryIndependentStudent
                      : messages.catalogBrowse.beforeEntryStudent}
                </p>
              </div>
              <div className="flex-1 pb-6">
                {user ? (
                  user.role === "adult" ? (
                    <PlacementPreTestStep
                      user={user}
                      onSuccess={(detail) => {
                        if (detail?.skippedPlacementTest) {
                          navigate("/learning-plan", { replace: true });
                        }
                      }}
                    />
                  ) : (
                    <PlacementPreferencesStep
                      user={user}
                      onSuccess={() => undefined}
                    />
                  )
                ) : null}
              </div>
            </div>

            <footer className="shrink-0 border-border border-t bg-card">
              <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <img src="/Icon.svg" className="w-8 h-10" />
                    <span className="font-display text-lg font-bold tracking-tight text-foreground">
                      Explys
                    </span>
                  </div>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    {messages.catalogBrowse.placementFooterBlurb}
                  </p>
                </div>
                <p className="shrink-0 text-sm text-muted-foreground">
                  {formatMessage(messages.catalogBrowse.placementCopyright, {
                    year: String(new Date().getFullYear()),
                  })}
                </p>
              </div>
            </footer>
          </div>
        </div>
      ) : null}

      {showPlacementTest ? (
        <div className="fixed inset-0 z-200 flex flex-col bg-background">
          {placementDocError ? (
            <div
              className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
              role="alert"
            >
              <p className="text-destructive text-sm font-medium">
                {messages.catalogBrowse.couldNotLoadPlacement}
              </p>
              <p className="text-muted-foreground max-w-md text-sm">
                {placementDocError}
              </p>
            </div>
          ) : placementDocHtml ? (
            <iframe
              key="placement-entry-test"
              title={messages.catalogBrowse.placementTestTitle}
              className="min-h-0 w-full flex-1 border-0 bg-background"
              srcDoc={placementDocHtml}
              onLoad={() => {
                try {
                  if (typeof console !== "undefined" && console.log) {
                    console.log("[placement:parent]", "iframe onLoad (srcDoc)");
                  }
                } catch {
                  /* */
                }
              }}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-solid border-primary border-t-4 border-r-transparent border-b-transparent border-l-transparent" />
              <p className="text-muted-foreground text-sm">
                {messages.catalogBrowse.loadingPlacement}
              </p>
            </div>
          )}
        </div>
      ) : null}

      {!needsPlacement &&
      !showPlacementPrepOverlay &&
      !showPlacementTest ? (
        <CatalogSpotlight
          open={spotlightOpen}
          onClose={() => setSpotlightOpen(false)}
          videos={spotlightVideos}
        />
      ) : null}
    </div>
  );
}
