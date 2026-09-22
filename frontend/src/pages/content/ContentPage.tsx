import { useMemo } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  HelpCircle,
  Lock,
  Calendar,
} from "lucide-react";
import { cn } from "../../lib/utils";
import VideoPlayer from "../../components/VideoPlayer";
import { VideoVocabulary } from "../../components/content-watch/VideoVocabulary";
import { VideoTranscript } from "../../components/content-watch/VideoTranscript";
import { VideoQuiz } from "../../components/content-watch/VideoQuiz";
import { defaultQuizQuestions } from "../../components/content-watch/defaultLessonSides";
import { SEO } from "../../components/SEO/SEO";
import { resolveCanonicalUrl } from "../../lib/siteUrl";
import { lessonSeo } from "../../lib/lessonSeo";
import { formatMessage } from "../../lib/formatMessage";
import { useIsLgUp } from "../../hooks/useMediaQuery";
import { AssignHomeworkButton } from "../../components/AssignHomeworkButton";
import { AgeVerificationModal } from "../../components/profile/AgeVerificationModal";

import {
  useLessonWatch,
  WATCHED_COMPLETED_RATIO,
} from "../../hooks/useLessonWatch";
import { type TabId, type LessonLabels } from "../../lib/lesson-utils";

const tabsFromLabels = (L: LessonLabels) =>
  [
    { id: "vocabulary" as const, label: L.vocabularyTab, icon: BookOpen },
    { id: "transcript" as const, label: L.transcriptTab, icon: FileText },
    { id: "quiz" as const, label: L.quizTab, icon: HelpCircle },
  ] as const;

function ContentWatchHeader({
  L,
  rightLabel,
  playlistRibbon,
}: {
  L: LessonLabels;
  rightLabel?: string;
  playlistRibbon?: any;
}) {
  return (
    <header className="z-100 fixed top-[var(--email-verification-banner-height,0px)] right-0 left-0 z-50 border-border border-b bg-background/80 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="grid grid-cols-3 items-center gap-3">
          <Link
            to="/catalog"
            className="flex shrink-0 items-center gap-2 justify-self-start text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm whitespace-nowrap">{L.backToCatalog}</span>
          </Link>
          <div className="flex min-w-0 items-center justify-center gap-2 justify-self-center">
            <Link to="/catalog">
              <img src={`${import.meta.env.BASE_URL}Icon.svg`} className="w-15 h-18 hover:cursor-pointer" />
            </Link>
            <span className="hidden sm:block font-display truncate font-bold text-foreground">
              Explys
            </span>
          </div>
          <div
            className="min-h-[1.25rem] justify-self-end text-right text-xs hover:cursor-pointer text-muted-foreground sm:text-sm"
            title={L.xpInfo}
          >
            {rightLabel?.trim() ? rightLabel : null}
          </div>
        </div>
        {playlistRibbon && playlistRibbon.total > 1 ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <div className="flex min-w-0 items-center gap-2">
              {playlistRibbon.prevVideoId != null ? (
                <Link
                  to={`/content/${playlistRibbon.prevVideoId}`}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {L.previous}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-muted-foreground/50">
                  <ChevronLeft className="h-4 w-4" />
                  {L.previous}
                </span>
              )}
            </div>
            <Link
              to={`/catalog/series/${encodeURIComponent(playlistRibbon.friendlyLink)}`}
              className="text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:text-sm"
            >
              {formatMessage(L.seriesProgress, {
                current: String(playlistRibbon.position),
                total: String(playlistRibbon.total),
              })}
            </Link>
            <div className="flex items-center gap-2">
              {playlistRibbon.nextVideoId != null ? (
                <Link
                  to={`/content/${playlistRibbon.nextVideoId}`}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
                >
                  {L.next}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-muted-foreground/50">
                  {L.next}
                  <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}

function LoadingView({ L }: { L: LessonLabels }) {
  return (
    <div className="min-h-screen bg-background">
      <ContentWatchHeader L={L} />
      <div className="mx-auto flex min-h-[70vh] max-w-7xl flex-col items-center justify-center gap-4 px-4 pt-20">
        <div
          className="border-muted h-14 w-14 animate-spin rounded-full border-4 border-t-primary border-solid"
          aria-hidden
        />
        <p className="text-sm font-medium text-muted-foreground">
          {L.loadingLesson}
        </p>
      </div>
    </div>
  );
}

function EmptyState({
  L,
  title,
  description,
  cta,
}: {
  L: LessonLabels;
  title: string;
  description: string;
  cta: { to: string; label: string };
}) {
  return (
    <div className="min-h-screen bg-background">
      <ContentWatchHeader L={L} />
      <main className="mx-auto max-w-lg px-4 pt-28 pb-20 text-center sm:px-6">
        <div className="rounded-[2rem] border-2 border-dashed border-border bg-card/50 px-8 py-14">
          <div className="mb-4 text-4xl" aria-hidden>
            🎬
          </div>
          <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
            {title}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
          <Link
            to={cta.to}
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {cta.label}
          </Link>
        </div>
      </main>
    </div>
  );
}

function TabBar({
  L,
  activeTab,
  onTabChange,
  className,
}: {
  L: LessonLabels;
  activeTab: TabId;
  onTabChange: (t: TabId) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex border-border border-b", className)}>
      {tabsFromLabels(L).map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "-mb-px flex flex-1 items-center hover:cursor-pointer justify-center gap-2 border-border border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:flex-none sm:px-4",
            activeTab === tab.id
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <tab.icon className="h-4 w-4 shrink-0" />
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}

function TabPanels({
  L,
  activeTab,
  vocabulary,
  sideLoading,
  transcriptLines,
  transcriptLoading,
  playbackSec,
  onSeekTranscript,
  quizPanel,
}: any) {
  return (
    <div className="py-6">
      <div
        className={activeTab === "vocabulary" ? "block" : "hidden"}
        aria-hidden={activeTab !== "vocabulary"}
      >
        {sideLoading ? (
          <p className="text-center text-sm text-muted-foreground">
            {L.preparingVocabulary}
          </p>
        ) : (
          <VideoVocabulary vocabulary={vocabulary} />
        )}
      </div>
      <div
        className={activeTab === "transcript" ? "block" : "hidden"}
        aria-hidden={activeTab !== "transcript"}
      >
        <VideoTranscript
          transcript={transcriptLines}
          loading={transcriptLoading}
          playbackSec={playbackSec}
          onSeek={onSeekTranscript}
          vocabulary={vocabulary}
        />
      </div>
      <div
        className={activeTab === "quiz" ? "block" : "hidden"}
        aria-hidden={activeTab !== "quiz"}
      >
        {quizPanel}
      </div>
    </div>
  );
}

export default function ContentPage() {
  const { id } = useParams();
  const isLgUp = useIsLgUp();

  const {
    L,
    user,
    activeTab,
    setActiveTab,
    isVideoComplete,
    videoData,
    playlistRibbon,
    loading,
    lessonSideBundle,
    sideBundleLoading,
    transcriptLines,
    transcriptLinesUk,
    transcriptLoading,
    playbackSec,
    setPlaybackSec,
    enrichedDisplayVocabulary,
    ageModalOpen,
    setAgeModalOpen,
    isLocked,
    needsDob,
    seekToCue,
    handlePlaybackFraction,
    handleVideoEnded,
    handleVideoPlay,
    handleQuizComplete,
    onVideoMount,
    headerRight,
    quizWaitingForServer,
    quizServerFailed,
  } = useLessonWatch(id);

  const playerTranscripts = useMemo(() => {
    // Если вообще нет данных
    if (!transcriptLines || transcriptLines.length === 0) return undefined;

    const tracks = [];

    // 1. Добавляем украинскую дорожку, если она пришла из хука
    if (transcriptLinesUk && transcriptLinesUk.length > 0) {
      tracks.push({
        id: "uk",
        label: "Українська",
        cues: transcriptLinesUk.map((cue: any) => ({
          startSec: cue.startSec,
          endSec: cue.endSec,
          text: cue.text || "",
        })),
      });
    }

    // 2. Добавляем английскую
    tracks.push({
      id: "en",
      label: "English",
      cues: transcriptLines.map((cue: any) => ({
        startSec: cue.startSec,
        endSec: cue.endSec,
        text: cue.text || "",
      })),
    });

    return tracks;
  }, [transcriptLines, transcriptLinesUk]); // Обязательно добавь сюда transcriptLinesUk!

  if (loading)
    return (
      <>
        <SEO
          title={L.seoLoadingTitle}
          description={L.seoLoadingDescription}
          canonicalUrl={resolveCanonicalUrl(id ? `/content/${id}` : "/catalog")}
          noindex
        />
        <LoadingView L={L} />
      </>
    );
  if (!id)
    return (
      <>
        <SEO
          title={L.seoPickTitle}
          description={L.seoPickDescription}
          canonicalUrl={resolveCanonicalUrl("/catalog")}
          noindex
        />
        <EmptyState
          L={L}
          title={L.noVideoSelectedTitle}
          description={L.pickLessonDescription}
          cta={{ to: "/catalog", label: L.browseCatalogCta }}
        />
      </>
    );
  if (!videoData)
    return (
      <>
        <SEO
          title={L.seoNotFoundTitle}
          description={L.seoNotFoundDescription}
          canonicalUrl={resolveCanonicalUrl(`/content/${id}`)}
          noindex
        />
        <EmptyState
          L={L}
          title={L.notFoundTitle}
          description={L.notFoundBody}
          cta={{ to: "/catalog", label: L.backToCatalog }}
        />
      </>
    );

  const descriptionBlurb =
    videoData.videoDescription?.trim() ||
    videoData.content.category.description?.trim() ||
    L.descriptionFallback;

  const quizPanel = !isVideoComplete ? (
    <VideoQuiz
      key={`quiz-lock-${id}`}
      questions={defaultQuizQuestions}
      isVideoComplete={false}
      onComplete={handleQuizComplete}
    />
  ) : quizWaitingForServer ? (
    <div className="py-10 text-center">
      <div
        className="border-muted mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-t-primary border-solid"
        aria-hidden
      />
      <p className="text-sm font-medium text-foreground">{L.loadingQuiz}</p>
      <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
        {L.loadingQuizHint}
      </p>
    </div>
  ) : quizServerFailed ? (
    <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-6 text-center text-sm">
      <p className="font-semibold text-foreground">{L.quizFailedTitle}</p>
      <p className="mt-2 text-muted-foreground">{L.quizFailedBody}</p>
    </div>
  ) : (
    <VideoQuiz
      key={`quiz-${id}-${lessonSideBundle!.gradingToken!.slice(0, 36)}`}
      questions={lessonSideBundle!.quizQuestions}
      isVideoComplete={true}
      onComplete={handleQuizComplete}
    />
  );

  const ageRestriction: Record<string, string> = {
    "0+": "bg-accent/20 text-accent border border-accent/40",
    "6+": "bg-(--light-blue)/20 text-(--light-blue) border border-(--light-blue)/40",
    "12+": "bg-(--yellow)/20 text-(--yellow) border border-(--yellow)/40",
    "16+": "bg-(--orange)/20 text-(--orange) border border-(--orange)/40",
    "18+": "bg-destructive/20 text-destructive border border-destructive/40",
    "21+": "bg-primary/20 text-primary border border-primary/40",
  };
  const videoLevel: Record<string, string> = {
    A1: "bg-accent/20 text-accent border border-accent/40",
    A2: "bg-accent/20 text-accent border border-accent/40",
    B1: "bg-primary/20 text-primary border border-primary/40",
    B2: "bg-primary/20 text-primary border border-primary/40",
    C1: "bg-destructive/20 text-destructive border border-destructive/40",
    C2: "bg-destructive/20 text-destructive border border-destructive/40",
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <SEO
        {...lessonSeo({
          id: id!,
          videoName: videoData.videoName,
          videoDescription: descriptionBlurb,
          videoLink: videoData.videoLink,
        })}
      />
      <ContentWatchHeader
        L={L}
        rightLabel={headerRight}
        playlistRibbon={playlistRibbon}
      />

      <main
        className={cn(
          playlistRibbon && playlistRibbon.total > 1 ? "pt-28" : "pt-16",
        )}
      >
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="overflow-hidden rounded-xl mt-5 border border-border bg-muted ring-1 ring-border/40">
                {isLocked ? (
                  <div className="aspect-video flex flex-col items-center justify-center bg-card/80 text-center p-6">
                    <div className="bg-destructive/20 p-4 rounded-full mb-4">
                      {needsDob ? (
                        <Calendar className="w-10 h-10 text-destructive" />
                      ) : (
                        <Lock className="w-10 h-10 text-destructive" />
                      )}
                    </div>
                    {needsDob ? (
                      <>
                        <h2 className="text-foreground font-bold text-2xl mb-2">
                          {L.ageVerificationRequired}
                        </h2>
                        <p className="text-muted-foreground text-sm max-w-md mb-5">
                          {L.ageVerificationDesc}
                        </p>
                        <button
                          type="button"
                          onClick={() => setAgeModalOpen(true)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2.5 px-6 rounded-xl transition-colors cursor-pointer"
                        >
                          {L.verifyAgeBtn}
                        </button>
                      </>
                    ) : (
                      <>
                        <h2 className="text-foreground font-bold text-2xl mb-2">
                          {L.adultsOnlyTitle}
                        </h2>
                        <p className="text-muted-foreground text-sm max-w-md">
                          {L.adultsOnlyDesc}
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <VideoPlayer
                    src={videoData.videoLink}
                    transcript={transcriptLines}
                    transcripts={playerTranscripts}
                    onEnded={handleVideoEnded}
                    onPlay={handleVideoPlay}
                    onPlaybackTime={(t) => setPlaybackSec(t)}
                    onPlaybackFraction={handlePlaybackFraction}
                    onVideoMount={onVideoMount}
                    className="rounded-none border-0"
                  />
                )}
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                    {videoData.content.category.name}
                  </span>
                  {!isLocked &&
                    (isVideoComplete ? (
                      <span className="text-sm text-accent">{L.watched}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {formatMessage(L.watchToUnlock, {
                          pct: String(
                            Math.round(WATCHED_COMPLETED_RATIO * 100),
                          ),
                        })}
                      </span>
                    ))}
                  {(user?.role?.toLowerCase() === "teacher" ||
                    user?.role?.toLowerCase() === "admin") && (
                    <div className="ml-2 z-50">
                      <AssignHomeworkButton
                        contentId={Number(id)}
                        contentName={videoData.videoName}
                      />
                    </div>
                  )}
                </div>
                <h1 className="font-display mb-3 text-2xl font-bold sm:text-3xl">
                  {videoData.videoName}
                </h1>

                {videoData.ageRestriction &&
                  ageRestriction[videoData.ageRestriction] && (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-[15px] px-2 py-0.5 text-xs font-semibold mb-3",
                        ageRestriction[videoData.ageRestriction],
                      )}
                    >
                      <p className="mr-1">{L.warning}</p>
                      {videoData.ageRestriction}
                    </span>
                  )}
                {videoData.content.stats?.systemTags?.find((t: string) =>
                  /^(A1|A2|B1|B2|C1|C2)$/i.test(t),
                ) &&
                  (() => {
                    const level = videoData.content.stats!.systemTags!.find(
                      (t: string) => /^(A1|A2|B1|B2|C1|C2)$/i.test(t),
                    )!;
                    return (
                      <span
                        className={cn(
                          "ml-1 inline-flex items-center rounded-[15px] px-2 py-0.5 text-xs font-semibold mb-3",
                          videoLevel[level.toUpperCase()],
                        )}
                      >
                        {level}
                      </span>
                    );
                  })()}
                <p className="leading-relaxed text-muted-foreground">
                  {descriptionBlurb}
                </p>
              </div>

              {!isLocked && (
                <div className="lg:hidden">
                  {!isLgUp ? (
                    <>
                      <TabBar
                        L={L}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                      />
                      <TabPanels
                        L={L}
                        activeTab={activeTab}
                        vocabulary={enrichedDisplayVocabulary}
                        sideLoading={sideBundleLoading}
                        transcriptLines={transcriptLines}
                        transcriptLoading={transcriptLoading}
                        playbackSec={playbackSec}
                        onSeekTranscript={seekToCue}
                        quizPanel={quizPanel}
                      />
                    </>
                  ) : null}
                </div>
              )}
            </div>

            {!isLocked && (
              <div className="hidden lg:block">
                {isLgUp ? (
                  <>
                    <TabBar
                      L={L}
                      activeTab={activeTab}
                      onTabChange={setActiveTab}
                    />
                    <div className="mt-0 max-h-[min(600px,70vh)] overflow-y-auto rounded-xl border border-border bg-card p-4">
                      <TabPanels
                        L={L}
                        activeTab={activeTab}
                        vocabulary={enrichedDisplayVocabulary}
                        sideLoading={sideBundleLoading}
                        transcriptLines={transcriptLines}
                        transcriptLoading={transcriptLoading}
                        playbackSec={playbackSec}
                        onSeekTranscript={seekToCue}
                        quizPanel={quizPanel}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </main>
      <AgeVerificationModal
        isOpen={ageModalOpen}
        onClose={() => setAgeModalOpen(false)}
        ageRestriction={videoData?.ageRestriction ?? undefined}
      />
    </div>
  );
}
