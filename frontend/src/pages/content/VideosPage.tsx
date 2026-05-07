import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { apiFetch, getApiBase, getStoredAccessToken } from "../../lib/api";
import { useUser } from "../../context/UserContext";
import PlacementPreferencesStep from "../../components/PlacementPreferencesStep";
import { ChameleonMascot } from "../../components/ChameleonMascot";
import { CatalogHero } from "../../components/catalog/CatalogHero";
import { CatalogSidebar } from "../../components/catalog/CatalogSidebar";
import { CatalogVideoRow } from "../../components/catalog/CatalogVideoRow";
import type { CatalogCardVideo } from "../../components/catalog/CatalogVideoCard";
import ContentHeader from "../../components/catalog/ContentHeader";
import { cn } from "../../lib/utils";
import { Frown } from "lucide-react";

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
  };
}

export default function VideoPage() {
  const [videos, setVideos] = useState<ContentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [englishLevel, setEnglsihLevel] = useState("All");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // collapsed by default (icon-only mode)
  const navigate = useNavigate();
  const { user, isLoading: userLoading, refreshProfile } = useUser();
  const placementCompleteHandled = useRef(false);
  const [placementPhase, setPlacementPhase] = useState<"preferences" | "test">(
    "preferences",
  );

  const accessToken = getStoredAccessToken();
  const needsPlacement =
    !userLoading &&
    !!accessToken &&
    !!user &&
    user.role !== "teacher" &&
    !user.hasCompletedPlacement;

  useEffect(() => {
    if (!needsPlacement) {
      setPlacementPhase("preferences");
      return;
    }
    const hasPrefs =
      (user.hobbies?.length ?? 0) > 0 && (user.favoriteGenres?.length ?? 0) > 0;
    setPlacementPhase(hasPrefs ? "test" : "preferences");
  }, [needsPlacement, user?.hobbies, user?.favoriteGenres]);

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
        void refreshProfile();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [needsPlacement, navigate, refreshProfile]);

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
      return [
        {
          title: selectedCategory,
          description: undefined as string | undefined,
          videos: filteredVideos.map(toCardVideo),
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
      .map(([title, list]) => ({
        title,
        description: undefined as string | undefined,
        videos: list.map(toCardVideo),
      }));
  }, [filteredVideos, selectedCategory]);

  const showPlacementPreferences =
    needsPlacement && placementPhase === "preferences" && user;
  const showPlacementTest =
    needsPlacement && placementPhase === "test" && accessToken;

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex-col">
      <ContentHeader />
      <div>
        <div className="flex">
          <CatalogSidebar
            categories={categoryNames}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            welcomeName={user?.name ? user.name.split(" ")[0] : undefined}
            englishLevel={user?.englishLevel || undefined}
            onSelectLevel={setEnglsihLevel}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
          />

          <main
            className={cn(
              "flex-1 transition-all duration-600 font-display",
              sidebarCollapsed ? "lg:ml-20" : "lg:ml-64",
            )}
          >
            <CatalogHero featured={featuredHero} />
            <div id="catalog-library" className="space-y-10">
              {loading ? (
                <div className="flex h-60 bg-card/30 flex-col items-center border-border border-t justify-center space-y-4">
                  <div className="h-10 w-10 animate-spin rounded-full border-solid border-primary border-t-4 border-r-transparent border-b-transparent border-l-transparent" />
                  <p className="animate-pulse text-muted-foreground">
                    Loading catalog…
                  </p>
                </div>
              ) : filteredVideos.length === 0 ? (
                <div className="border-t border-border bg-card/30 py-15 text-center">
                  <Frown className="text-foreground/70 justify-center w-full w-10 h-10 pb-2" />
                  <h2 className="font-display text-2xl font-bold">
                    Nothing here yet
                  </h2>
                  <p className="mt-2 text-muted-foreground">
                    {videos.length === 0
                      ? "Check back soon for new lessons."
                      : "Try clearing the category filter."}
                  </p>
                </div>
              ) : (
                catalogRows.map((row) => (
                  <CatalogVideoRow
                    key={row.title}
                    title={row.title}
                    description={row.description}
                    videos={row.videos}
                  />
                ))
              )}
            </div>
          </main>
        </div>

        {!sidebarCollapsed && (
          <div
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}
      </div>

      {showPlacementPreferences ? (
        <div className="fixed inset-0 z-200 flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
          <header className="shrink-0 border-border border-b bg-background">
            <div className="mx-auto grid w-full max-w-4xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4">
              <div aria-hidden="true" />
              <div className="flex items-center gap-2">
                <ChameleonMascot
                  size="sm"
                  mood="thinking"
                  animate={false}
                  className="h-10! w-10!"
                />
                <span className="font-display text-lg font-bold tracking-tight text-foreground">
                  Exply
                </span>
              </div>
              <span className="justify-self-end text-sm text-muted-foreground">
                1 / 2
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
              aria-label="Placement flow progress"
            >
              <div className="h-full w-1/2 rounded-full bg-primary transition-all" />
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="mx-auto w-full max-w-md shrink-0 px-4 pt-2 pb-2">
              <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
                Before your entry test
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A few quick preferences — then your placement questionnaire.
              </p>
            </div>
            <div className="flex-1 pb-6">
              <PlacementPreferencesStep
                user={user}
                onSuccess={() => setPlacementPhase("test")}
              />
            </div>
            <footer className="shrink-0 border-border border-t bg-card">
              <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <ChameleonMascot
                      size="sm"
                      mood="happy"
                      animate={false}
                      className="h-10! w-10!"
                    />
                    <span className="font-display text-lg font-bold tracking-tight text-foreground">
                      Exply
                    </span>
                  </div>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Personalized English learning through adaptive video content
                    — learn at your own pace.
                  </p>
                </div>
                <p className="shrink-0 text-sm text-muted-foreground">
                  © {new Date().getFullYear()} Exply
                </p>
              </div>
            </footer>
          </div>
        </div>
      ) : null}

      {showPlacementTest ? (
        <div className="fixed inset-0 z-200 flex flex-col bg-background">
          <iframe
            title="Placement test"
            className="min-h-0 w-full flex-1 border-0 bg-background"
            src={`${getApiBase()}/placement-test/document?access_token=${encodeURIComponent(accessToken)}`}
          />
        </div>
      ) : null}
    </div>
  );
}
