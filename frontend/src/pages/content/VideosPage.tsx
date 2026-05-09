import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  apiFetch,
  getApiBase,
  getResponseErrorMessage,
  getStoredAccessToken,
} from "../../lib/api";
import { useUser } from "../../context/UserContext";
import PlacementPreferencesStep from "../../components/PlacementPreferencesStep";
import PlacementPreTestStep, {
  adultNeedsPlacementPrepFields,
} from "../../components/PlacementPreTestStep";
import { CatalogHero } from "../../components/catalog/CatalogHero";
import { CatalogSidebar } from "../../components/catalog/CatalogSidebar";
import { CatalogVideoRow } from "../../components/catalog/CatalogVideoRow";
import type { CatalogCardVideo } from "../../components/catalog/CatalogVideoCard";
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

/** Ensure API origin in srcDoc HTML matches the SPA client (avoids broken inline script / proxy host skew). */
function placementPatchApiOrigin(html: string, apiOrigin: string): string {
  const trimmed = apiOrigin.replace(/\/$/, "");
  const esc = trimmed.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return html.replace(
    /<meta\s+name="explys-placement-api-origin"\s+content="[^"]*"\s*\/?\s*>/i,
    `<meta name="explys-placement-api-origin" content="${esc}" />`,
  );
}

export default function VideoPage() {
  const [videos, setVideos] = useState<ContentVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // collapsed by default (icon-only mode)
  const [placementDocHtml, setPlacementDocHtml] = useState<string | null>(null);
  const [placementDocError, setPlacementDocError] = useState<string | null>(
    null,
  );
  const navigate = useNavigate();
  const { user, isLoading: userLoading, refreshProfile } = useUser();
  const placementCompleteHandled = useRef(false);

  const accessToken = getStoredAccessToken();
  const needsPlacement =
    !userLoading &&
    !!accessToken &&
    !!user &&
    user.role !== "teacher" &&
    !user.hasCompletedPlacement;

  /** Derive phase synchronously so we never flash the wrong overlay (effect + stale initial state). */
  const placementPhaseResolved = useMemo((): "preferences" | "test" | "off" => {
    if (!needsPlacement || !user) return "off";
    if (user.role === "adult") {
      return adultNeedsPlacementPrepFields(user) ? "preferences" : "test";
    }
    const hasPrefs =
      (user.hobbies?.length ?? 0) > 0 && (user.favoriteGenres?.length ?? 0) > 0;
    return hasPrefs ? "test" : "preferences";
  }, [
    needsPlacement,
    user,
    user?.hobbies,
    user?.favoriteGenres,
    user?.role,
    user?.nativeLanguage,
    user?.workField,
    user?.education,
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
      // #region agent log
      if (ev.data?.type === "placement_diag") {
        try {
          if (typeof console !== "undefined" && console.log) {
            console.log("[placement:parent]", ev.data.step, ev.data.data ?? {});
          }
        } catch {
          /* */
        }
        fetch(
          "http://127.0.0.1:7658/ingest/d719e046-fe6c-4322-a0e2-5351c6126712",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "0c8a48",
            },
            body: JSON.stringify({
              sessionId: "0c8a48",
              hypothesisId: "IFRAME",
              location: "VideosPage.tsx:message",
              message: String(ev.data?.step ?? "placement_diag"),
              data: (ev.data?.data as object) ?? {},
              timestamp: Date.now(),
            }),
          },
        ).catch(() => {});
        return;
      }
      // #endregion
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
            e instanceof Error ? e.message : "Could not load placement test.",
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

  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex-col">
      <div>
        <div className="flex">
          <CatalogSidebar
            categories={categoryNames}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            welcomeName={user?.name ? user.name.split(" ")[0] : undefined}
            englishLevel={user?.englishLevel || undefined}
            collapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
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
            <div className="mx-auto mb-4 w-full max-w-2xl flex flex-col min-h-0 bg-card border border-border rounded-3xl overflow-scroll">
              <div className="mx-auto w-full max-w-md shrink-0 px-4 pt-2 pb-2">
                <h2 className="font-display text-xl font-semibold mt-1 tracking-tight text-foreground">
                  Before your entry test
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {user?.role === "adult"
                    ? "Enter your job, education, and native language — then your placement questionnaire starts."
                    : "A few quick preferences — then your placement questionnaire."}
                </p>
              </div>
              <div className="flex-1 pb-6">
                {user ? (
                  user.role === "adult" ? (
                    <PlacementPreTestStep
                      user={user}
                      onSuccess={() => undefined}
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
                    Personalized English learning through adaptive video content
                    — learn at your own pace.
                  </p>
                </div>
                <p className="shrink-0 text-sm text-muted-foreground">
                  © {new Date().getFullYear()} Explys
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
                Could not load the placement test.
              </p>
              <p className="text-muted-foreground max-w-md text-sm">
                {placementDocError}
              </p>
            </div>
          ) : placementDocHtml ? (
            <iframe
              key="placement-entry-test"
              title="Placement test"
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
                Loading placement test…
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
