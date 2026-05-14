import { useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react";
import { Link } from "react-router";
import {
  CheckCircle,
  ChevronDown,
  Lock,
  PlayCircle,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { apiFetch } from "../../lib/api";
import { useUser } from "../../context/UserContext";
import { useLandingLocale } from "../../context/LandingLocaleContext";
import { formatMessage } from "../../lib/formatMessage";
import { pct01, SkillBar } from "./KnowledgeMeters";

/**
 * Profile progress subsection with an accessible expand/collapse header.
 */
function ProgressCollapsibleCard(props: {
  sectionId: string;
  titleLabel: string;
  expandAria: string;
  collapseAria: string;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  action?: ReactNode;
  children: ReactNode;
}): ReactElement {
  const {
    sectionId,
    titleLabel,
    expandAria,
    collapseAria,
    open,
    onOpenChange,
    action,
    children,
  } = props;
  const titleId = `${sectionId}-heading`;
  const panelId = `${sectionId}-panel`;
  return (
    <div className="rounded-xl border border-border/50 bg-card/50 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
        <button
          type="button"
          id={titleId}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left font-display text-lg font-semibold text-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? collapseAria : expandAria}
          onClick={() => onOpenChange(!open)}
        >
          <ChevronDown
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform duration-200",
              !open && "-rotate-90",
            )}
            aria-hidden
          />
          <span className="truncate">{titleLabel}</span>
        </button>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div
        id={panelId}
        role="region"
        aria-labelledby={titleId}
        hidden={!open}
      >
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

type KnowledgeTagRow = {
  name: string;
  score: number;
  listening: number;
  vocabulary: number;
  grammar: number;
  topicCount: number;
};

type RecentWatchedLesson = {
  contentVideoId: number;
  videoName: string;
  seriesName: string;
  lastWatchedAt: string;
  completed: boolean;
  secondsWatched: number;
  bestScorePct: number | null;
};

type VocabularyProgressPayload = {
  total: number;
  learned: number;
  mastered: number;
  reviewing: number;
  studyingLanguage: string;
};

/**
 * Progress tab: theme knowledge, recent lessons, and vocabulary.
 */
export function ProfileProgress() {
  const { user } = useUser();
  const { messages } = useLandingLocale();
  const p = messages.profileProgress;
  const [tagRows, setTagRows] = useState<KnowledgeTagRow[] | null>(null);
  const [tagsError, setTagsError] = useState<string | null>(null);
  const [recentLessons, setRecentLessons] = useState<RecentWatchedLesson[] | null>(
    null,
  );
  const [recentError, setRecentError] = useState<string | null>(null);
  const [vocabStats, setVocabStats] = useState<VocabularyProgressPayload | null>(
    null,
  );
  const [vocabError, setVocabError] = useState<string | null>(null);
  const [themeOpen, setThemeOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(true);
  const [vocabOpen, setVocabOpen] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      setTagsError(null);
      const r = await apiFetch("/auth/profile/knowledge-tags", {
        method: "GET",
      });
      if (!r.ok) {
        if (!cancelled) {
          setTagRows([]);
          setTagsError(p.tagsError);
        }
        return;
      }
      const raw: unknown = await r.json();
      if (cancelled || !raw || typeof raw !== "object") {
        return;
      }
      const tags = (raw as { tags?: unknown }).tags;
      if (!Array.isArray(tags)) {
        setTagRows([]);
        return;
      }
      const parsed: KnowledgeTagRow[] = [];
      for (const row of tags) {
        if (!row || typeof row !== "object") {
          continue;
        }
        const o = row as Record<string, unknown>;
        const name = typeof o.name === "string" ? o.name.trim() : "";
        if (!name) {
          continue;
        }
        parsed.push({
          name,
          score: Number(o.score) || 0,
          listening: Number(o.listening) || 0,
          vocabulary: Number(o.vocabulary) || 0,
          grammar: Number(o.grammar) || 0,
          topicCount: Number(o.topicCount) || 0,
        });
      }
      setTagRows(parsed);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, p.tagsError]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      setRecentError(null);
      setRecentLessons(null);
      const r = await apiFetch("/content-video/recent-watched?limit=8", {
        method: "GET",
      });
      if (!r.ok) {
        if (!cancelled) {
          setRecentLessons([]);
          setRecentError(p.recentVideosError);
        }
        return;
      }
      const raw: unknown = await r.json();
      if (cancelled || !Array.isArray(raw)) {
        if (!cancelled) setRecentLessons([]);
        return;
      }
      const parsed: RecentWatchedLesson[] = [];
      for (const row of raw) {
        if (!row || typeof row !== "object") continue;
        const o = row as Record<string, unknown>;
        const contentVideoId = Number(o.contentVideoId);
        if (!Number.isFinite(contentVideoId)) continue;
        const videoName =
          typeof o.videoName === "string" ? o.videoName.trim() : "";
        const seriesName =
          typeof o.seriesName === "string" ? o.seriesName.trim() : "";
        const lastWatchedAt =
          typeof o.lastWatchedAt === "string" ? o.lastWatchedAt : "";
        if (!lastWatchedAt) continue;
        const completed = o.completed === true;
        const secondsWatched = Number(o.secondsWatched ?? 0) || 0;
        let bestScorePct: number | null = null;
        if (o.bestScorePct != null) {
          const s = Number(o.bestScorePct);
          if (Number.isFinite(s)) {
            bestScorePct = Math.round(s * 10) / 10;
          }
        }
        parsed.push({
          contentVideoId,
          videoName: videoName || "—",
          seriesName: seriesName || "—",
          lastWatchedAt,
          completed,
          secondsWatched,
          bestScorePct,
        });
      }
      setRecentLessons(parsed);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, p.recentVideosError]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      setVocabError(null);
      setVocabStats(null);
      const r = await apiFetch("/auth/profile/vocabulary-progress", {
        method: "GET",
      });
      if (!r.ok) {
        if (!cancelled) {
          setVocabStats({
            total: 0,
            learned: 0,
            mastered: 0,
            reviewing: 0,
            studyingLanguage: "",
          });
          setVocabError(p.vocabProgressError);
        }
        return;
      }
      const raw: unknown = await r.json();
      if (cancelled || !raw || typeof raw !== "object") {
        if (!cancelled) {
          setVocabStats({
            total: 0,
            learned: 0,
            mastered: 0,
            reviewing: 0,
            studyingLanguage: "",
          });
        }
        return;
      }
      const o = raw as Record<string, unknown>;
      const studyingLanguage =
        typeof o.studyingLanguage === "string"
          ? o.studyingLanguage.trim()
          : "";
      setVocabStats({
        total: Math.max(0, Math.floor(Number(o.total ?? 0))),
        learned: Math.max(0, Math.floor(Number(o.learned ?? 0))),
        mastered: Math.max(0, Math.floor(Number(o.mastered ?? 0))),
        reviewing: Math.max(0, Math.floor(Number(o.reviewing ?? 0))),
        studyingLanguage,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, p.vocabProgressError]);

  const vocabBar = useMemo(() => {
    if (!vocabStats) {
      return {
        overallPct: 0,
        masteredPct: 0,
        reviewingPct: 0,
      };
    }
    const t = vocabStats.total;
    if (t <= 0) {
      return {
        overallPct: 0,
        masteredPct: 0,
        reviewingPct: 0,
      };
    }
    const learned = Math.min(vocabStats.learned, t);
    const mastered = Math.min(vocabStats.mastered, t);
    const reviewing = Math.min(vocabStats.reviewing, t);
    return {
      overallPct: Math.round((learned / t) * 100),
      masteredPct: (mastered / t) * 100,
      reviewingPct: (reviewing / t) * 100,
    };
  }, [vocabStats]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{p.previewNote}</p>

      <ProgressCollapsibleCard
        sectionId="progress-theme"
        titleLabel={p.knowledgeByTag}
        expandAria={formatMessage(p.progressSectionToggleExpand, {
          section: p.knowledgeByTag,
        })}
        collapseAria={formatMessage(p.progressSectionToggleCollapse, {
          section: p.knowledgeByTag,
        })}
        open={themeOpen}
        onOpenChange={setThemeOpen}
      >
        {tagRows === null ? (
          <p className="text-sm text-muted-foreground">{p.loadingTags}</p>
        ) : tagsError ? (
          <p className="text-sm text-destructive">{tagsError}</p>
        ) : tagRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {p.noTagsBodyBeforeLink}{" "}
            <Link to="/catalog" aria-label={p.catalogLinkAria} className="text-primary underline-offset-4 hover:underline">
              {p.noTagsCatalogLink}
            </Link>
            {"."}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {tagRows.map((row) => (
              <li
                key={row.name}
                className="rounded-xl border border-border/40 bg-secondary/25 p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{row.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.averagedOver} {row.topicCount}{" "}
                      {row.topicCount === 1 ? p.topicsOne : p.topicsMany}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-primary/15 px-2 py-0.5 text-sm font-semibold tabular-nums text-primary">
                    {pct01(row.score)}%
                  </span>
                </div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {p.skillOverall}
                </p>
                <div className="mb-3 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${pct01(row.score)}%` }}
                  />
                </div>
                <div className="space-y-2.5 pt-1">
                  <SkillBar
                    label={p.listening}
                    value={row.listening}
                    barClass="bg-sky-500/80 dark:bg-sky-400/90"
                  />
                  <SkillBar
                    label={p.vocabulary}
                    value={row.vocabulary}
                    barClass="bg-violet-500/80 dark:bg-violet-400/85"
                  />
                  <SkillBar
                    label={p.grammar}
                    value={row.grammar}
                    barClass="bg-amber-500/75 dark:bg-amber-400/80"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </ProgressCollapsibleCard>

      <ProgressCollapsibleCard
        sectionId="progress-recent"
        titleLabel={p.recentVideos}
        expandAria={formatMessage(p.progressSectionToggleExpand, {
          section: p.recentVideos,
        })}
        collapseAria={formatMessage(p.progressSectionToggleCollapse, {
          section: p.recentVideos,
        })}
        open={recentOpen}
        onOpenChange={setRecentOpen}
        action={
          <Link
            to="/watched-lessons"
            className="text-sm font-medium text-primary hover:underline"
          >
            {p.viewAll}
          </Link>
        }
      >
        {recentLessons === null ? (
          <p className="text-sm text-muted-foreground">{p.recentVideosLoading}</p>
        ) : recentError ? (
          <p className="text-sm text-destructive">{recentError}</p>
        ) : recentLessons.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {p.recentVideosEmpty}{" "}
            <Link
              to="/catalog"
              className="text-primary underline-offset-4 hover:underline"
            >
              {p.noTagsCatalogLink}
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            {recentLessons.map((video) => {
              const minutes = Math.max(
                1,
                Math.round(video.secondsWatched / 60),
              );
              const showScore =
                video.completed &&
                video.bestScorePct != null &&
                Number.isFinite(video.bestScorePct);
              const inProgress =
                !video.completed && video.secondsWatched > 0;
              return (
                <Link
                  key={video.contentVideoId}
                  to={`/content/${video.contentVideoId}`}
                  aria-label={formatMessage(p.recentVideosOpenLessonAria, {
                    title: video.videoName,
                  })}
                  className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-secondary/30"
                >
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-lg",
                      video.completed
                        ? "bg-accent/20"
                        : inProgress
                          ? "bg-primary/20"
                          : "bg-secondary",
                    )}
                  >
                    {video.completed ? (
                      <CheckCircle className="size-5 text-accent" />
                    ) : inProgress ? (
                      <PlayCircle className="size-5 text-primary" />
                    ) : (
                      <Lock className="size-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground">
                      {video.videoName}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {video.seriesName}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {showScore ? (
                      <span className="rounded-md bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                        {p.scorePrefix} {video.bestScorePct}%
                      </span>
                    ) : video.completed ? (
                      <span className="text-sm text-muted-foreground">
                        {p.lessonCompletedNoScore}
                      </span>
                    ) : inProgress ? (
                      <span className="text-sm text-muted-foreground">
                        {formatMessage(p.inProgressMinutes, {
                          minutes: String(minutes),
                        })}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {p.notStartedStatus}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </ProgressCollapsibleCard>

      <ProgressCollapsibleCard
        sectionId="progress-vocab"
        titleLabel={p.vocabularyProgress}
        expandAria={formatMessage(p.progressSectionToggleExpand, {
          section: p.vocabularyProgress,
        })}
        collapseAria={formatMessage(p.progressSectionToggleCollapse, {
          section: p.vocabularyProgress,
        })}
        open={vocabOpen}
        onOpenChange={setVocabOpen}
      >
        {vocabStats === null ? (
          <p className="text-sm text-muted-foreground">{p.vocabProgressLoading}</p>
        ) : vocabError ? (
          <p className="text-sm text-destructive">{vocabError}</p>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl bg-secondary/30 p-4 text-center">
                <p className="text-3xl font-bold text-foreground">
                  {vocabStats.total}
                </p>
                <p className="text-sm text-muted-foreground">{p.vocabTotalWords}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-4 text-center">
                <p className="text-3xl font-bold text-primary">
                  {vocabStats.learned}
                </p>
                <p className="text-sm text-muted-foreground">{p.vocabLearned}</p>
              </div>
              <div className="rounded-xl bg-accent/10 p-4 text-center">
                <p className="text-3xl font-bold text-accent">
                  {vocabStats.mastered}
                </p>
                <p className="text-sm text-muted-foreground">{p.vocabMastered}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-4 text-center">
                <p className="text-3xl font-bold text-foreground">
                  {vocabStats.reviewing}
                </p>
                <p className="text-sm text-muted-foreground">{p.vocabReviewing}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{p.overallProgressLabel}</span>
                <span className="font-medium text-foreground">
                  {vocabBar.overallPct}%
                </span>
              </div>
              <div className="flex h-4 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-accent"
                  style={{
                    width: `${vocabBar.masteredPct}%`,
                  }}
                />
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${vocabBar.reviewingPct}%`,
                  }}
                />
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-accent" /> {p.legendMastered}
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-primary" /> {p.legendLearning}
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-secondary" /> {p.legendRemaining}
                </span>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {formatMessage(p.vocabProgressFootnote, {
                lang: vocabStats.studyingLanguage || "—",
              })}
            </p>
          </>
        )}
      </ProgressCollapsibleCard>
    </div>
  );
}
