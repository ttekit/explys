import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
// import PlacementPreTestStep from "../../components/PlacementPreTestStep";
import {
  learnerNeedsPlacement,
  // resolvePlacementPhase,
} from "../../lib/learnerOnboarding";
import { SEO } from "../../components/SEO/SEO";
import { resolveCanonicalUrl } from "../../lib/siteUrl";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { CatalogWelcomeBar } from "../../components/catalog/CatalogWelcomeBar";
import { AgeVerificationModal } from "../../components/profile/AgeVerificationModal";
import { CatalogHero } from "../../components/catalog/CatalogHero";
import { CatalogSidebar } from "../../components/catalog/CatalogSidebar";
import { CatalogVideoRow } from "../../components/catalog/CatalogVideoRow";
import {
  CatalogSpotlight,
  type CatalogSpotlightItem,
} from "../../components/catalog/CatalogSpotlight";
import {
  CatalogVideoCard,
  type CatalogCardVideo,
} from "../../components/catalog/CatalogVideoCard";
import { cn } from "../../lib/utils";
import {
  buildClientRecommendedVideos,
  fetchContentRecommendations,
  mapRecommendationsToCatalogCards,
} from "../../lib/contentRecommendations";
import { appEn } from "../../locales/app/en";
import { appUk } from "../../locales/app/uk";
import { Layers, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { isTrustedIframeMessageOrigin } from "../../lib/trustedMessageOrigin";
import { AuthSplitLayout } from "../../components/AuthSplitLayout";

interface ContentVideo {
  id: number;
  friendlyLink?: string | null;
  videoName: string;
  videoDescription: string | null;
  videoLink: string;
  thumbnailUrl?: string;
  playlistPosition?: number;
  ageRestriction?: string;
  content: {
    id: number;
    playlistPosition?: number;
    category: {
      id: number;
      name: string;
      description: string;
      friendlyLink: string;
    };
    stats?: {
      userTags?: string[];
      systemTags?: string[];
      topics?: { id: number; name: string }[];
    } | null;
  };
}

function toCardVideo(video: ContentVideo): CatalogCardVideo {
  const systemTags = video.content?.stats?.systemTags || [];
  const levelTag = systemTags.find((tag) => /^(A1|A2|B1|B2|C1|C2)$/i.test(tag));

  return {
    id: video.id,
    friendlyLink: video.friendlyLink || undefined,
    title: video.videoName,
    categoryLabel: video.content.category.name,
    thumbnailUrl: video.thumbnailUrl,
    videoLink: video.videoLink,
    ageRestriction: video.ageRestriction,
    level: levelTag,
  };
}

function placementPatchApiOrigin(html: string, apiOrigin: string): string {
  const trimmed = apiOrigin.replace(/\/$/, "");
  const esc = trimmed.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return html.replace(
    /<meta\s+name="explys-placement-api-origin"\s+content="[^"]*"\s*\/?\s*>/i,
    `<meta name="explys-placement-api-origin" content="${esc}" />`,
  );
}

const STRIPE_CHECKOUT_CATALOG_TOAST_ID = "stripe-checkout-catalog-welcome";

function stripCheckoutSuccessSearch(): { pathname: string; search: string } {
  const pathname = window.location.pathname;
  const p = new URLSearchParams(window.location.search);
  if (p.get("checkout") !== "success") {
    return { pathname, search: window.location.search };
  }
  p.delete("checkout");
  p.delete("session_id");
  const q = p.toString();
  return { pathname, search: q ? `?${q}` : "" };
}

const LEVELS_LIST = ["All", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
const AGE_LIST = ["All", "0+", "6+", "12+", "16+", "18+"] as const;

function getPaginationRange(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3)
    return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}

export default function VideoPage() {
  const [videos, setVideos] = useState<ContentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedAge, setSelectedAge] = useState("All");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [placementDocHtml, setPlacementDocHtml] = useState<string | null>(null);
  const [placementDocError, setPlacementDocError] = useState<string | null>(
    null,
  );
  const navigate = useNavigate();
  const location = useLocation();
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [recommendedCards, setRecommendedCards] = useState<CatalogCardVideo[]>(
    [],
  );

  const [currentPage, setCurrentPage] = useState(1);
  const catalogTopRef = useRef<HTMLDivElement>(null);

  const { user, isLoading: userLoading, refreshProfile } = useUser();
  const { messages, locale } = useLandingLocale();
  const catalogSeo = messages.catalogPage;
  const placementCompleteHandled = useRef(false);

  const levelScrollRef = useRef<HTMLDivElement>(null);
  const genreScrollRef = useRef<HTMLDivElement>(null);
  const ageScrollRef = useRef<HTMLDivElement>(null);
  const [forceTest, setForceTest] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [ageVerificationTarget, setAgeVerificationTarget] = useState<
    string | null
  >(null);

  const openAgeVerification = useCallback((ageRestriction: string) => {
    setAgeVerificationTarget(ageRestriction);
  }, []);

  const handleAgeSelect = (age: string) => {
    setSelectedAge(age);
  };

  const scrollContainer = useCallback(
    (ref: React.RefObject<HTMLDivElement | null>, dir: "left" | "right") => {
      if (ref.current) {
        ref.current.scrollBy({
          left: dir === "left" ? -250 : 250,
          behavior: "smooth",
        });
      }
    },
    [],
  );

  const scrollToCatalogTop = () => {
    if (catalogTopRef.current) {
      const y =
        catalogTopRef.current.getBoundingClientRect().top +
        window.scrollY -
        100;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLevel, selectedGenre, selectedAge]);

  const cb = locale === "uk" ? appUk.catalogBrowse : appEn.catalogBrowse;

  const filterLabel = (value: string): string => {
    if (value === "All") return cb.filterAll;
    if (value === "Recommended") return cb.filterRecommended;
    return value;
  };

  const buildFilteredTitle = (): string => {
    if (selectedGenre === "Recommended") return cb.filterRecommendedForYou;
    let title = cb.filterFilteredResults;
    if (selectedLevel !== "All") title += ` - ${selectedLevel}`;
    if (selectedAge !== "All") title += ` - ${selectedAge}`;
    if (selectedGenre !== "All") title += ` - ${filterLabel(selectedGenre)}`;
    return title;
  };

  const catalogCheckoutReturn = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("checkout") === "success" && params.has("session_id");
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
            toast.success(
              cb.stripeThanksToast || "Thank you for your purchase!",
              { id: STRIPE_CHECKOUT_CATALOG_TOAST_ID, duration: 6000 },
            );
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
            cb.stripeConfirmError || "Could not confirm subscription.",
            { duration: 8000, id: `${STRIPE_CHECKOUT_CATALOG_TOAST_ID}-err` },
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    catalogCheckoutReturn,
    navigate,
    refreshProfile,
    cb.stripeConfirmError,
    cb.stripeThanksToast,
  ]);

  const accessToken = getStoredAccessToken();
  const needsPlacement =
    !userLoading && !!accessToken && !!user && learnerNeedsPlacement(user);

  // const placementPhaseResolved = useMemo(() => {
  //   if (!needsPlacement || !user) {
  //     return "off" as const;
  //   }
  //   return resolvePlacementPhase(user);
  // }, [needsPlacement, user]);

  const handleSkipTest = async () => {
    setIsSkipping(true);
    try {
      await apiFetch("/auth/update-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ englishLevel: "A1" }),
      });
      await refreshProfile();
    } catch (error) {
      console.error("Failed to skip test:", error);
    } finally {
      setIsSkipping(false);
    }
  };

  const showPlacementPrepOverlay = needsPlacement && !forceTest;

  // А сам тест (iframe) загрузится только тогда, когда нажата кнопка
  const showPlacementTest = needsPlacement && forceTest && !!accessToken;
  useEffect(() => {
    if (!needsPlacement) {
      placementCompleteHandled.current = false;
      return;
    }

    const onMessage = (ev: MessageEvent) => {
      if (
        !isTrustedIframeMessageOrigin(ev.origin) &&
        ev.origin !== "null" &&
        ev.origin !== window.location.origin
      ) {
        return;
      }

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
          try {
            await refreshProfile();
          } catch (error) {
            console.error("Failed to refresh profile:", error);
          } finally {
            navigate("/learning-plan", { replace: true });
          }
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
        const res = await apiFetch(`/placement-test/document?lang=${locale}`, {
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
            e instanceof Error
              ? e.message
              : cb.placementLoadError || "Failed to load placement test.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showPlacementTest, accessToken, cb.placementLoadError, locale]);

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

  const thumbnailByVideoId = useMemo(() => {
    const map = new Map<number, string | undefined>();
    for (const v of videos) {
      map.set(v.id, v.thumbnailUrl);
    }
    return map;
  }, [videos]);

  const ageRestrictionByVideoId = useMemo(() => {
    const map = new Map<number, string | undefined>();
    for (const v of videos) {
      map.set(v.id, v.ageRestriction);
    }
    return map;
  }, [videos]);

  useEffect(() => {
    if (loading) return;
    if (videos.length === 0) {
      setRecommendedCards([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      const userId = user?.id ? Number.parseInt(user.id, 10) : Number.NaN;
      let cards: CatalogCardVideo[] = [];

      if (Number.isFinite(userId) && userId > 0) {
        const data = await fetchContentRecommendations(userId);
        if (data?.recommendations?.length) {
          cards = mapRecommendationsToCatalogCards(
            data.recommendations,
            thumbnailByVideoId,
            12,
            ageRestrictionByVideoId,
            user ?? null,
          );
        }
      }

      if (cards.length === 0) {
        cards = buildClientRecommendedVideos(videos, user ?? null, 12);
      }

      if (!cancelled) {
        setRecommendedCards(cards);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, videos, user, thumbnailByVideoId, ageRestrictionByVideoId]);

  useEffect(() => {
    const raw = location.state as
      | { openSpotlight?: boolean }
      | null
      | undefined;
    if (raw?.openSpotlight) {
      setSpotlightOpen(true);
      void navigate(
        { pathname: location.pathname, search: location.search },
        { replace: true, state: {} },
      );
    }
  }, [location.state, location.pathname, location.search, navigate]);

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
      friendlyLink: v.friendlyLink,
      title: v.videoName,
      category: v.content.category.name,
      description: v.videoDescription ?? null,
      thumbnailUrl: v.thumbnailUrl,
      videoLink: v.videoLink,
    }));
  }, [videos]);

  const genreNames = useMemo(() => {
    const tags = new Set<string>();
    videos.forEach((v) => {
      v.content.stats?.userTags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [videos]);

  const sortedGenres = useMemo(() => {
    return ["All", "Recommended", ...genreNames.filter(Boolean)];
  }, [genreNames]);

  const recommendedVideoIds = useMemo(() => {
    return new Set(recommendedCards.map((c) => c.id));
  }, [recommendedCards]);

  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (v.content?.category?.friendlyLink?.startsWith("t-")) {
        return false;
      }

      const matchLevel =
        selectedLevel === "All" ||
        (v.content.stats?.systemTags &&
          v.content.stats.systemTags.includes(selectedLevel));

      let matchGenre = true;
      if (selectedGenre === "Recommended") {
        matchGenre = recommendedVideoIds.has(v.id);
      } else if (selectedGenre !== "All") {
        matchGenre = !!(
          v.content.stats?.userTags &&
          v.content.stats.userTags.includes(selectedGenre)
        );
      }

      const vidAge = v.ageRestriction || "0+";
      const matchAge = selectedAge === "All" || vidAge === selectedAge;

      return matchLevel && matchGenre && matchAge;
    });
  }, [videos, selectedLevel, selectedGenre, selectedAge, recommendedVideoIds]);

  const featured = filteredVideos[0] ?? null;
  const featuredHero = useMemo(() => {
    return featured
      ? {
          id: featured.id,
          friendlyLink: featured.friendlyLink,
          title: featured.videoName,
          description:
            featured.videoDescription ??
            featured.content.category.description ??
            "",
          categoryName: featured.content.category.name,
          thumbnailUrl: featured.thumbnailUrl,
        }
      : null;
  }, [featured]);

  const hasFilters =
    selectedLevel !== "All" || selectedGenre !== "All" || selectedAge !== "All";

  const catalogRows = useMemo(() => {
    if (filteredVideos.length === 0) return [];
    if (hasFilters) return [];

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
            typeof a.content.playlistPosition === "number"
              ? a.content.playlistPosition
              : 0;
          const mb =
            typeof b.content.playlistPosition === "number"
              ? b.content.playlistPosition
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
  }, [filteredVideos, hasFilters]);

  const visibleRecommended = useMemo(() => {
    if (recommendedCards.length === 0) return [];
    const allowedIds = new Set(filteredVideos.map((v) => v.id));
    return recommendedCards.filter((card) => allowedIds.has(card.id));
  }, [recommendedCards, filteredVideos]);

  const GRID_PAGE_SIZE = 24;
  const ROWS_PAGE_SIZE = 10;

  const totalPages = hasFilters
    ? Math.ceil(filteredVideos.length / GRID_PAGE_SIZE)
    : Math.ceil(catalogRows.length / ROWS_PAGE_SIZE);

  const paginatedVideos = hasFilters
    ? filteredVideos.slice(
        (currentPage - 1) * GRID_PAGE_SIZE,
        currentPage * GRID_PAGE_SIZE,
      )
    : [];

  const paginatedRows = !hasFilters
    ? catalogRows.slice(
        (currentPage - 1) * ROWS_PAGE_SIZE,
        currentPage * ROWS_PAGE_SIZE,
      )
    : [];

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground antialiased flex-col">
      {activatingSubscriptionOverlay ? (
        <div
          className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
          <p className="text-muted-foreground text-sm">
            {cb.activatingSubscription || "Activating your subscription..."}
          </p>
        </div>
      ) : null}
      <SEO
        title={catalogSeo?.title || "Catalog"}
        description={catalogSeo?.description || "Explys Catalog"}
        canonicalUrl={resolveCanonicalUrl("/catalog")}
        ogLocale={locale === "uk" ? "uk_UA" : "en_US"}
        ogLocaleAlternate={locale === "uk" ? "en_US" : "uk_UA"}
        noindex
      />
      <div>
        <div className="flex w-full">
          {/* Сайдбар остается нетронутым */}
          <CatalogSidebar
            selectedLevel={selectedLevel}
            onSelectLevel={setSelectedLevel}
            genres={genreNames}
            selectedGenre={selectedGenre}
            onSelectGenre={setSelectedGenre}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
            catalogSpotlightOpen={spotlightOpen}
            onOpenCatalogSpotlight={() => setSpotlightOpen(true)}
            reserveTopNavSpace={false}
          />

          <main
            className={cn(
              "flex-1 w-full pb-24 transition-all duration-300 font-display lg:pb-8 relative",
              sidebarCollapsed
                ? "lg:ml-20 lg:max-w-[calc(100vw-5rem)]"
                : "lg:ml-64 lg:max-w-[calc(100vw-16rem)]",
            )}
          >
            <div>
              <CatalogHero featured={featuredHero} />
              <CatalogWelcomeBar />

              <div className="px-4 sm:px-6 lg:px-8 space-y-4 mt-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6 border-b border-border/60 pb-6 overflow-hidden">
                  <div className="flex flex-col gap-1.5 min-w-0 w-full md:w-auto">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <Layers className="size-3.5" /> {cb.filterLevel}
                    </span>
                    <div className="relative group/level flex w-full items-center">
                      <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-background to-transparent z-10" />

                      <button
                        type="button"
                        onClick={() => scrollContainer(levelScrollRef, "left")}
                        className="absolute hover:cursor-pointer left-0 z-20 hidden h-6 w-6 -translate-x-2 items-center justify-center rounded-full bg-background/80 shadow-md md:group-hover/level:flex hover:bg-muted"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <div
                        ref={levelScrollRef}
                        className="flex gap-1.5 overflow-x-auto pb-1 scroll-smooth w-full pr-12"
                        style={{
                          scrollbarWidth: "none",
                          msOverflowStyle: "none",
                        }}
                      >
                        {LEVELS_LIST.map((lvl) => (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => setSelectedLevel(lvl)}
                            className={cn(
                              "ml-0.5 rounded-full shrink-0 px-4 py-1.5 text-xs font-semibold transition-all hover:cursor-pointer",
                              selectedLevel === lvl
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary",
                            )}
                          >
                            {filterLabel(lvl)}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => scrollContainer(levelScrollRef, "right")}
                        className="absolute hover:cursor-pointer right-0 z-20 hidden h-6 w-6 translate-x-1 items-center justify-center rounded-full bg-background/80 shadow-md md:group-hover/level:flex hover:bg-muted"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* 2. ФИЛЬТР ВОЗРАСТА */}
                  <div className="flex flex-col gap-1.5 min-w-0 w-full md:w-auto">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <Lock className="size-3.5 opacity-70" /> {cb.filterAge}
                    </span>
                    <div className="relative group/age flex w-full items-center">
                      <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-background to-transparent z-10" />

                      <button
                        type="button"
                        onClick={() => scrollContainer(ageScrollRef, "left")}
                        className="absolute hover:cursor-pointer left-0 z-20 hidden h-6 w-6 -translate-x-2 items-center justify-center rounded-full bg-background/80 shadow-md md:group-hover/age:flex hover:bg-muted"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <div
                        ref={ageScrollRef}
                        className="flex gap-1.5 overflow-x-auto pb-1 scroll-smooth w-full pr-12"
                        style={{
                          scrollbarWidth: "none",
                          msOverflowStyle: "none",
                        }}
                      >
                        {AGE_LIST.map((age) => (
                          <button
                            key={age}
                            type="button"
                            onClick={() => handleAgeSelect(age)}
                            className={cn(
                              "ml-0.5 rounded-full shrink-0 px-4 py-1.5 text-xs font-semibold transition-all hover:cursor-pointer",
                              selectedAge === age
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "bg-secondary text-secondary-foreground hover:bg-primary/10 hover:text-primary",
                            )}
                          >
                            {filterLabel(age)}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => scrollContainer(ageScrollRef, "right")}
                        className="absolute hover:cursor-pointer right-0 z-20 hidden h-6 w-6 translate-x-1 items-center justify-center rounded-full bg-background/80 shadow-md md:group-hover/age:flex hover:bg-muted"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* 3. ФИЛЬТР ЖАНРОВ */}
                  {genreNames.length > 0 && (
                    <div className="flex flex-col gap-1.5 min-w-0 w-full md:w-auto">
                      <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                        <img
                          src={`${import.meta.env.BASE_URL}Icon.svg`}
                          className="size-3.5 grayscale opacity-70"
                          alt=""
                        />{" "}
                        {cb.filterGenre}
                      </span>
                      <div className="relative group/genre flex w-full items-center">
                        <div className="pointer-events-none absolute right-0 top-0 h-full w-12 bg-gradient-to-l from-background to-transparent z-10" />

                        <button
                          type="button"
                          onClick={() =>
                            scrollContainer(genreScrollRef, "left")
                          }
                          className="absolute hover:cursor-pointer left-0 z-20 hidden h-6 w-6 -translate-x-2 items-center justify-center rounded-full bg-background/80 shadow-md md:group-hover/genre:flex hover:bg-muted"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div
                          ref={genreScrollRef}
                          className="flex gap-1.5 overflow-x-auto pb-1 scroll-smooth w-full pr-12"
                          style={{
                            scrollbarWidth: "none",
                            msOverflowStyle: "none",
                          }}
                        >
                          {sortedGenres.map((gen) => (
                            <button
                              key={gen}
                              type="button"
                              onClick={() => setSelectedGenre(gen)}
                              className={cn(
                                "ml-0.5 rounded-full px-4 shrink-0 py-1.5 text-xs font-semibold transition-all hover:cursor-pointer",
                                selectedGenre === gen
                                  ? "bg-accent text-accent-foreground shadow-md"
                                  : "bg-secondary text-secondary-foreground hover:bg-accent/10 hover:text-accent",
                              )}
                            >
                              {filterLabel(gen)}
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            scrollContainer(genreScrollRef, "right")
                          }
                          className="absolute hover:cursor-pointer right-0 z-20 hidden h-6 w-6 translate-x-1 items-center justify-center rounded-full bg-background/80 shadow-md md:group-hover/genre:flex hover:bg-muted"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div
                id="catalog-library"
                ref={catalogTopRef}
                className="space-y-10 px-4 sm:px-6 lg:px-8 pt-2 scroll-mt-24"
              >
                {loading ? (
                  <div className="flex h-60 bg-card/30 flex-col items-center rounded-[30px] justify-center space-y-4">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent border-b-transparent" />
                    <p className="animate-pulse text-muted-foreground text-sm">
                      {cb.loadingCatalog}
                    </p>
                  </div>
                ) : filteredVideos.length === 0 ? (
                  <div className=" flex flex-col rounded-[30px] bg-card/30 py-15 text-center justify-center items-center">
                    <img src={`${import.meta.env.BASE_URL}SadIcon.svg`} className="w-25 h-30 mb-3" alt="" />
                    <h2 className="font-display text-2xl font-bold">
                      {cb.emptyTitle}
                    </h2>
                    <p className="mt-2 text-muted-foreground text-sm">
                      {videos.length === 0
                        ? cb.emptyNoVideos
                        : cb.emptyFiltered}
                    </p>
                  </div>
                ) : hasFilters ? (
                  <div className="space-y-6">
                    <h2 className="font-display text-xl font-bold text-foreground">
                      {buildFilteredTitle()}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                      {paginatedVideos.map((video) => (
                        <CatalogVideoCard
                          key={video.id}
                          video={toCardVideo(video)}
                          onRequestAgeVerification={openAgeVerification}
                          className="w-full"
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {currentPage === 1 && visibleRecommended.length > 0 ? (
                      <CatalogVideoRow
                        title={cb.recommendedTitle}
                        description={cb.recommendedDescription}
                        videos={visibleRecommended}
                        onRequestAgeVerification={openAgeVerification}
                      />
                    ) : null}

                    {paginatedRows.map((row) => (
                      <CatalogVideoRow
                        key={row.title}
                        title={row.title}
                        description={row.description}
                        seriesFriendlyLink={row.seriesFriendlyLink}
                        videos={row.videos}
                        onRequestAgeVerification={openAgeVerification}
                      />
                    ))}
                  </>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && !loading && (
                  <div className="flex items-center justify-center gap-2 mt-12 mb-8 font-display">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPage((p) => Math.max(1, p - 1));
                        scrollToCatalogTop();
                      }}
                      disabled={currentPage === 1}
                      className="flex items-center justify-center px-4 py-2 min-h-[44px] rounded-xl bg-card border border-border text-foreground font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted transition-colors cursor-pointer"
                    >
                      {cb.prev}
                    </button>

                    {getPaginationRange(currentPage, totalPages).map((p, i) =>
                      p === "..." ? (
                        <span
                          key={`ellipsis-${i}`}
                          className="flex items-center justify-center px-2 py-2 min-h-[44px] text-muted-foreground font-bold"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={`page-${p}`}
                          type="button"
                          onClick={() => {
                            setCurrentPage(p as number);
                            scrollToCatalogTop();
                          }}
                          className={cn(
                            "flex items-center justify-center min-w-[44px] px-3 py-2 min-h-[44px] rounded-xl font-bold transition-colors cursor-pointer",
                            currentPage === p
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "bg-card border border-border text-foreground hover:bg-muted",
                          )}
                        >
                          {p}
                        </button>
                      ),
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setCurrentPage((p) => Math.min(totalPages, p + 1));
                        scrollToCatalogTop();
                      }}
                      disabled={currentPage === totalPages}
                      className="flex items-center justify-center px-6 py-2 min-h-[44px] rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors cursor-pointer shadow-sm"
                    >
                      {cb.next}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {showPlacementPrepOverlay ? (
        <div className="fixed inset-0 z-200 bg-background overflow-y-auto">
          <AuthSplitLayout
            progressStep={3}
            progressTotal={3}
            rightTitle={cb.placementPrepRightTitle}
            rightSubtitle={cb.placementPrepRightSubtitle}
          >
            <div className="mb-6 flex items-center gap-3">
              <img src={`${import.meta.env.BASE_URL}Icon.svg`} className="w-12 h-15" alt="Explys" />
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                  {cb.placementTakeTestTitle || "Let's find your level"}
                </h1>
              </div>
            </div>

            <p className="mb-8 text-sm text-muted-foreground leading-relaxed">
              {cb.placementTakeTestDesc ||
                "Please take a short placement test. It helps us understand your current English level so we can recommend the perfect videos and quizzes for you."}
            </p>

            <div className="flex flex-col gap-3 w-full">
              <button
                onClick={() => setForceTest(true)}
                className="w-full rounded-xl bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer"
              >
                {cb.placementBtnStart || "Start the test"}
              </button>
              <button
                onClick={handleSkipTest}
                disabled={isSkipping}
                className="w-full rounded-xl border border-border bg-background px-6 py-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted cursor-pointer disabled:opacity-50"
              >
                {isSkipping
                  ? "..."
                  : cb.placementBtnSkip || "Skip test (Start at A1)"}
              </button>
            </div>
          </AuthSplitLayout>
        </div>
      ) : null}
      {showPlacementTest ? (
        <div className="fixed inset-0 z-200 flex flex-col bg-background">
          {placementDocError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-destructive text-sm font-medium">
                {cb.couldNotLoadPlacement || "Could not load placement test."}
              </p>
              <p className="text-muted-foreground max-w-md text-sm">
                {placementDocError}
              </p>
            </div>
          ) : placementDocHtml ? (
            <iframe
              key="placement-entry-test"
              title={cb.placementTestTitle || "Placement Test"}
              className="min-h-0 w-full flex-1 border-0 bg-background"
              srcDoc={placementDocHtml}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-solid border-primary border-t-4 border-r-transparent border-b-transparent border-l-transparent" />
              <p className="text-muted-foreground text-sm">
                {cb.loadingPlacement || "Loading placement test..."}
              </p>
            </div>
          )}
        </div>
      ) : null}

      {!needsPlacement && !showPlacementPrepOverlay && !showPlacementTest ? (
        <CatalogSpotlight
          open={spotlightOpen}
          onClose={() => setSpotlightOpen(false)}
          videos={spotlightVideos}
        />
      ) : null}

      <AgeVerificationModal
        isOpen={ageVerificationTarget !== null}
        onClose={() => setAgeVerificationTarget(null)}
        ageRestriction={ageVerificationTarget ?? undefined}
      />
    </div>
  );
}
