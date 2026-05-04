import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router";
import {
  BarChart3,
  Captions,
  Eye,
  Layers,
  Play,
  Plus,
  RefreshCw,
  Search,
  Tags,
  Trash2,
  Upload,
  Video,
  Edit,
} from "lucide-react";
import {
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminCardContent,
  AdminCardHeader,
  AdminCardTitle,
  AdminInput,
  AdminModal,
  AdminProgress,
  AdminSelectNative,
  AdminTextarea,
} from "../../components/admin/adminUi";
import {
  AdminRowMenu,
  AdminRowMenuItem,
} from "../../components/admin/AdminRowMenu";
import type { AdminCatalogVideoRow } from "../../lib/adminVideosApi";
import {
  createAdminCatalogVideo,
  deleteAdminCatalogContent,
  fetchAdminCatalogVideos,
  fetchAdminVideoSubtitlesVtt,
  matchesVideoLevelFilter,
  patchAdminContentVideo,
  regenerateAdminVideoLevelTags,
  regenerateAdminVideoCaptions,
  regenerateAdminVideoThemeTags,
  videoLevelBadge,
} from "../../lib/adminVideosApi";

function slugFriendly(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = Date.now().toString(36);
  const slug = `${base}-${suffix}`;
  const trimmed =
    slug.length > 100 ? slug.slice(0, 100).replace(/-[^-]*$/, "") : slug;
  return trimmed?.length >= 4 ? trimmed : `video-${suffix}`;
}

type MetadataInspectTab = "themes" | "levels" | "subs";

function ChipList(props: {
  tags: string[];
  emptyLabel: string;
}) {
  const { tags, emptyLabel } = props;
  const list = (tags ?? []).filter((t) => t.trim().length > 0);
  if (list.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{emptyLabel}</p>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {list.map((t, i) => (
        <AdminBadge
          key={`${t}-${i}`}
          variant="secondary"
          className="max-w-full truncate font-normal"
        >
          {t}
        </AdminBadge>
      ))}
    </div>
  );
}

export default function AdminVideosPage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<AdminCatalogVideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadSaving, setUploadSaving] = useState(false);

  const [editing, setEditing] = useState<AdminCatalogVideoRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [regenBusy, setRegenBusy] = useState<false | "tags" | "genres" | "captions">(false);

  const [deleteCandidate, setDeleteCandidate] =
    useState<AdminCatalogVideoRow | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [inspectMeta, setInspectMeta] = useState<{
    video: AdminCatalogVideoRow;
    tab: MetadataInspectTab;
  } | null>(null);
  const [subtitleText, setSubtitleText] = useState<string | null>(null);
  const [subtitleLoading, setSubtitleLoading] = useState(false);
  const [subtitleError, setSubtitleError] = useState<string | null>(null);

  const seriesNames = useMemo(() => {
    const names = videos.map((v) => v.content.category.name.trim()).filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [videos]);

  const loadVideos = useCallback(async (): Promise<
    AdminCatalogVideoRow[] | null
  > => {
    setLoadError(null);
    try {
      setLoading(true);
      const rows = await fetchAdminCatalogVideos();
      setVideos(rows);
      return rows;
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load videos");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  useEffect(() => {
    setSubtitleText(null);
    setSubtitleError(null);
    setSubtitleLoading(false);
  }, [inspectMeta?.video.id]);

  useEffect(() => {
    if (!inspectMeta || inspectMeta.tab !== "subs") return;
    const link = inspectMeta.video.videoCaption?.subtitlesFileLink?.trim();
    if (!link) return;
    let cancelled = false;
    setSubtitleLoading(true);
    setSubtitleError(null);
    setSubtitleText(null);
    void fetchAdminVideoSubtitlesVtt(inspectMeta.video.id)
      .then((text) => {
        if (!cancelled) setSubtitleText(text);
      })
      .catch((e) => {
        if (!cancelled) {
          setSubtitleError(e instanceof Error ? e.message : "Could not load subtitles");
        }
      })
      .finally(() => {
        if (!cancelled) setSubtitleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inspectMeta?.video.id, inspectMeta?.tab]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return videos.filter((v) => {
      const matchSearch =
        v.videoName.toLowerCase().includes(q) ||
        (v.videoDescription ?? "").toLowerCase().includes(q) ||
        v.content.category.name.toLowerCase().includes(q);
      const matchSeries =
        seriesFilter === "all" || v.content.category.name === seriesFilter;
      const matchLevel = matchesVideoLevelFilter(v, levelFilter);
      return matchSearch && matchSeries && matchLevel;
    });
  }, [videos, searchQuery, seriesFilter, levelFilter]);

  const stats = useMemo(() => {
    const watchers = videos.reduce(
      (a, v) => a + (v.content.stats?.usersWatched ?? 0),
      0,
    );
    let ratingSum = 0;
    let ratingN = 0;
    for (const v of videos) {
      const r = v.content.stats?.rating;
      if (r != null && r > 0) {
        ratingSum += r;
        ratingN += 1;
      }
    }
    const avgRating = ratingN > 0 ? ratingSum / ratingN : 0;
    return {
      total: videos.length,
      watchers,
      avgRating,
      seriesCount: seriesNames.length,
    };
  }, [videos, seriesNames.length]);

  const openEdit = useCallback((v: AdminCatalogVideoRow) => {
    setEditing(v);
    setEditName(v.videoName);
    setEditDesc(v.videoDescription ?? "");
  }, []);

  const handleSaveEdit = async () => {
    if (!editing) return;
    const name = editName.trim();
    if (name.length < 2) {
      toast.error("Title must be at least 2 characters");
      return;
    }
    setEditSaving(true);
    try {
      await patchAdminContentVideo(editing.id, {
        videoName: name,
        videoDescription: editDesc.trim() || null,
      });
      toast.success("Video updated");
      setEditing(null);
      await loadVideos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setEditSaving(false);
    }
  };

  const handleRegenThemeTags = async () => {
    if (!editing) return;
    const vid = editing.id;
    setRegenBusy("tags");
    try {
      const r = await regenerateAdminVideoThemeTags(vid);
      if (r.geminiFailed) {
        toast.error("Gemini unavailable — theme tags unchanged");
      } else {
        toast.success("Theme tags regenerated");
      }
      const rows = await loadVideos();
      const u = rows?.find((x) => x.id === vid);
      if (u) {
        setEditing(u);
        setEditName(u.videoName);
        setEditDesc(u.videoDescription ?? "");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Regeneration failed");
    } finally {
      setRegenBusy(false);
    }
  };

  const handleRegenLevelTags = async () => {
    if (!editing) return;
    const vid = editing.id;
    setRegenBusy("genres");
    try {
      const r = await regenerateAdminVideoLevelTags(vid);
      if (r.geminiFailed) {
        toast.error("Gemini unavailable — level tags unchanged");
      } else {
        toast.success("Level / CEFR tags regenerated");
      }
      const rows = await loadVideos();
      const u = rows?.find((x) => x.id === vid);
      if (u) {
        setEditing(u);
        setEditName(u.videoName);
        setEditDesc(u.videoDescription ?? "");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Regeneration failed");
    } finally {
      setRegenBusy(false);
    }
  };

  const handleRegenCaptions = async () => {
    if (!editing) return;
    const vid = editing.id;
    setRegenBusy("captions");
    try {
      await regenerateAdminVideoCaptions(vid);
      toast.success("Captions regenerated (WebVTT on S3)");
      const rows = await loadVideos();
      const u = rows?.find((x) => x.id === vid);
      if (u) {
        setEditing(u);
        setEditName(u.videoName);
        setEditDesc(u.videoDescription ?? "");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Caption generation failed");
    } finally {
      setRegenBusy(false);
    }
  };

  const handleUpload = async () => {
    const name = uploadTitle.trim();
    const description = uploadDesc.trim().slice(0, 250);
    if (name.length < 2 || description.length > 250) {
      toast.error("Title ≥ 2 characters; description ≤ 250.");
      return;
    }
    if (!uploadFile || uploadFile.type !== "video/mp4") {
      toast.error("Choose an MP4 file.");
      return;
    }
    setUploadSaving(true);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("name", name);
      fd.append("friendlyLink", slugFriendly(name));
      fd.append(
        "description",
        (description || `${name} — learner catalog.`).slice(0, 250),
      );
      await createAdminCatalogVideo(fd);
      toast.success("Video uploaded and published");
      setUploadOpen(false);
      setUploadTitle("");
      setUploadDesc("");
      setUploadFile(null);
      await loadVideos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    const contentRootId = deleteCandidate.content.category.id;
    setDeleteSaving(true);
    try {
      await deleteAdminCatalogContent(contentRootId);
      toast.success(`${deleteCandidate.videoName} removed from catalog`);
      setDeleteCandidate(null);
      await loadVideos();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteSaving(false);
    }
  };

  const levelFor = videoLevelBadge;
  const ratingProgress = (r: number) =>
    Math.min(100, Math.round((Math.max(0, r) / 5) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Videos
          </h1>
          <p className="text-muted-foreground">
            Catalog from{" "}
            <code className="text-xs">GET /content-video</code>; upload{" "}
            <code className="text-xs">POST /contents/create</code>.
          </p>
        </div>
        <AdminButton className="gap-2" onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4" />
          Upload video
        </AdminButton>
      </div>

      <AdminModal
        open={uploadOpen}
        onClose={() => !uploadSaving && setUploadOpen(false)}
        title="Upload new video"
        footer={
          <>
            <AdminButton
              variant="outline"
              onClick={() => setUploadOpen(false)}
              disabled={uploadSaving}
            >
              Cancel
            </AdminButton>
            <AdminButton
              disabled={uploadSaving}
              onClick={() => void handleUpload()}
            >
              {uploadSaving ? "Publishing…" : "Publish"}
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <label className="block cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50">
            <input
              type="file"
              accept="video/mp4"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setUploadFile(f);
              }}
            />
            <Upload className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Browse for MP4</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {uploadFile ? uploadFile.name : "MP4 only (server-enforced max size)"}
            </p>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium" htmlFor="admin-vid-title">
                Title (video name)
              </label>
              <AdminInput
                id="admin-vid-title"
                placeholder="Title"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="admin-vid-desc">
              Lesson / series description
            </label>
            <AdminTextarea
              id="admin-vid-desc"
              className="min-h-[96px]"
              placeholder="Shown in catalog (max 250 characters)…"
              value={uploadDesc}
              maxLength={250}
              onChange={(e) => setUploadDesc(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Friendly URL slug is generated automatically.
            </p>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={editing != null}
        onClose={() => !editSaving && !regenBusy && setEditing(null)}
        title={`Edit · ${editing?.videoName ?? ""}`}
        footer={
          <>
            <AdminButton
              variant="outline"
              onClick={() => setEditing(null)}
              disabled={editSaving || !!regenBusy}
            >
              Cancel
            </AdminButton>
            <AdminButton
              disabled={editSaving || !!regenBusy}
              onClick={() => void handleSaveEdit()}
            >
              {editSaving ? "Saving…" : "Save"}
            </AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="admin-edit-vid-name">
              Video title
            </label>
            <AdminInput
              id="admin-edit-vid-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="admin-edit-vid-desc">
              Description
            </label>
            <AdminTextarea
              id="admin-edit-vid-desc"
              className="min-h-[96px]"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
            />
          </div>
          <div className="space-y-2 border-border border-t pt-4">
            <p className="text-sm font-medium">Transcript metadata</p>
            <p className="text-xs text-muted-foreground">
              <strong>Captions:</strong> the server FFmpeg-decodes speech to WAV, then Deepgram Listen (default{" "}
              <code className="text-[11px]">nova-3</code>;{" "}
              <code className="text-[11px]">DEEPGRAM_TRANSCRIBE_MODEL</code>) needs{" "}
              <code className="text-[11px]">DEEPGRAM_API_KEY</code> plus an audible soundtrack in the MP4.{" "}
              <strong>Tags / genres</strong> use WebVTT + Gemini afterward.
            </p>
            <div className="flex flex-wrap gap-2">
              <AdminButton
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={editSaving || !!regenBusy}
                onClick={() => void handleRegenCaptions()}
              >
                <Captions className="h-4 w-4" />
                {regenBusy === "captions" ? "Working…" : "Regenerate captions"}
              </AdminButton>
              <AdminButton
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={editSaving || !!regenBusy}
                onClick={() => void handleRegenThemeTags()}
              >
                <Tags className="h-4 w-4" />
                {regenBusy === "tags" ? "Working…" : "Regenerate tags"}
              </AdminButton>
              <AdminButton
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                disabled={editSaving || !!regenBusy}
                onClick={() => void handleRegenLevelTags()}
              >
                <Layers className="h-4 w-4" />
                {regenBusy === "genres" ? "Working…" : "Regenerate genres"}
              </AdminButton>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Series label:{" "}
            <span className="text-foreground">
              {editing?.content.category.name ?? ""}
            </span>{" "}
            — change catalog structure in CMS if needed later.
          </p>
        </div>
      </AdminModal>

      <AdminModal
        open={deleteCandidate != null}
        onClose={() => !deleteSaving && setDeleteCandidate(null)}
        title="Remove lesson from catalog"
        footer={
          <>
            <AdminButton
              variant="outline"
              onClick={() => setDeleteCandidate(null)}
              disabled={deleteSaving}
            >
              Cancel
            </AdminButton>
            <AdminButton
              variant="danger"
              disabled={deleteSaving}
              onClick={() => void handleConfirmDelete()}
            >
              {deleteSaving ? "Removing…" : "Delete"}
            </AdminButton>
          </>
        }
      >
        <p className="text-sm text-foreground">
          Delete{" "}
          <strong>{deleteCandidate?.videoName}</strong> and its catalog entry (
          series <strong>{deleteCandidate?.content.category.name}</strong>)?
          This uses <code>cascade delete</code> from the backend content row.
        </p>
      </AdminModal>

      <AdminModal
        open={inspectMeta != null}
        onClose={() => setInspectMeta(null)}
        title={inspectMeta?.video.videoName ?? "Video metadata"}
        footer={
          <AdminButton variant="outline" onClick={() => setInspectMeta(null)}>
            Close
          </AdminButton>
        }
      >
        {inspectMeta ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 border-border border-b pb-3">
              <AdminButton
                type="button"
                size="sm"
                variant={inspectMeta.tab === "themes" ? "primary" : "outline"}
                className="gap-1.5"
                onClick={() =>
                  setInspectMeta({ ...inspectMeta, tab: "themes" })
                }
              >
                <Tags className="h-4 w-4" />
                Tags
              </AdminButton>
              <AdminButton
                type="button"
                size="sm"
                variant={inspectMeta.tab === "levels" ? "primary" : "outline"}
                className="gap-1.5"
                onClick={() =>
                  setInspectMeta({ ...inspectMeta, tab: "levels" })
                }
              >
                <Layers className="h-4 w-4" />
                Genres / level
              </AdminButton>
              <AdminButton
                type="button"
                size="sm"
                variant={inspectMeta.tab === "subs" ? "primary" : "outline"}
                className="gap-1.5"
                onClick={() =>
                  setInspectMeta({ ...inspectMeta, tab: "subs" })
                }
              >
                <Captions className="h-4 w-4" />
                Subtitles
              </AdminButton>
            </div>

            {inspectMeta.tab === "themes" ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Theme tags
                </p>
                <ChipList
                  tags={inspectMeta.video.content.stats?.userTags ?? []}
                  emptyLabel='No theme tags yet. Edit this video → “Regenerate tags”.'
                />
              </div>
            ) : null}

            {inspectMeta.tab === "levels" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Level / genres (system tags)
                  </p>
                  <ChipList
                    tags={inspectMeta.video.content.stats?.systemTags ?? []}
                    emptyLabel='No level bands yet. Edit → “Regenerate genres”.'
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Processing complexity:{" "}
                  <span className="font-medium text-foreground">
                    {inspectMeta.video.content.stats?.processingComplexity != null ?
                      inspectMeta.video.content.stats.processingComplexity
                    : "—"}
                  </span>
                </p>
              </div>
            ) : null}

            {inspectMeta.tab === "subs" ? (
              <div className="space-y-3">
                {inspectMeta.video.videoCaption?.subtitlesFileLink ?
                  <>
                    <p className="text-xs text-muted-foreground">
                      Loaded via{" "}
                      <code className="text-[11px]">
                        GET /content-video/:id/subtitles
                      </code>
                      {" "}
                      (same API token as admin).
                    </p>
                    <a
                      href={inspectMeta.video.videoCaption.subtitlesFileLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-sm text-primary underline-offset-4 hover:underline"
                    >
                      Open raw file on storage
                    </a>
                  </>
                : (
                  <p className="text-sm text-muted-foreground">
                    No captions row yet. Open Edit → Regenerate captions.
                  </p>
                )}
                {subtitleLoading ?
                  <p className="text-sm text-muted-foreground">Loading WebVTT…</p>
                : null}
                {subtitleError ?
                  <p className="text-sm text-destructive">{subtitleError}</p>
                : null}
                {subtitleText ?
                  <pre className="max-h-[min(420px,50vh)] overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] whitespace-pre-wrap break-all">
                    {subtitleText}
                  </pre>
                : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </AdminModal>

      {loadError ? (
        <AdminCard className="border-destructive/40">
          <AdminCardContent className="p-6 text-sm text-destructive">
            {loadError}
          </AdminCardContent>
        </AdminCard>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminCard>
          <AdminCardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Video className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {loading ? "…" : stats.total}
              </p>
              <p className="text-sm text-muted-foreground">Videos</p>
            </div>
          </AdminCardContent>
        </AdminCard>
        <AdminCard>
          <AdminCardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
              <Video className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {loading ? "…" : stats.seriesCount}
              </p>
              <p className="text-sm text-muted-foreground">Series titles</p>
            </div>
          </AdminCardContent>
        </AdminCard>
        <AdminCard>
          <AdminCardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <Eye className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {loading ? "…" : stats.watchers.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                Completed watches (stored)
              </p>
            </div>
          </AdminCardContent>
        </AdminCard>
        <AdminCard>
          <AdminCardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
              <BarChart3 className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {loading ? "…" : stats.avgRating.toFixed(1)}
              </p>
              <p className="text-sm text-muted-foreground">
                Avg rating (videos with scores)
              </p>
            </div>
          </AdminCardContent>
        </AdminCard>
      </div>

      <AdminCard>
        <AdminCardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-border border-b pt-6">
          <AdminButton
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={loading}
            onClick={() => void loadVideos()}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin opacity-70" : ""}`}
            />
            Refresh
          </AdminButton>
        </AdminCardHeader>
        <AdminCardHeader className="border-border border-b pb-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 opacity-70" />
              <AdminInput
                className="pl-10"
                placeholder="Search videos…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <AdminSelectNative
                value={seriesFilter}
                onChange={(e) => setSeriesFilter(e.target.value)}
              >
                <option value="all">All series</option>
                {seriesNames.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </AdminSelectNative>
              <AdminSelectNative
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                <option value="all">All levels</option>
                {(["A1", "A2", "B1", "B2", "C1", "C2"] as const).map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
                <option value="__misc">Other / no CEFR tag</option>
              </AdminSelectNative>
            </div>
          </div>
        </AdminCardHeader>
        <AdminCardContent className="p-6">
          {loading ? (
            <p className="py-16 text-center text-muted-foreground">
              Loading catalog…
            </p>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Video className="mx-auto mb-2 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No videos match filters</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((video) => {
                const watchers = video.content.stats?.usersWatched ?? 0;
                const rating = video.content.stats?.rating ?? 0;
                const lvl = levelFor(video);
                return (
                  <div
                    key={video.id}
                    className="rounded-lg border border-border bg-muted/30 transition-colors hover:border-primary/40"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-t-lg bg-muted">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-muted to-accent/20" />
                      <div className="absolute top-2 left-2">
                        <AdminBadge variant="accent">catalog</AdminBadge>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100">
                        <a
                          href={`/content/${video.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 shadow-lg"
                          aria-label="Preview in new tab"
                        >
                          <Play className="ml-1 h-6 w-6 text-primary-foreground" />
                        </a>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <AdminCardTitle className="truncate text-base">
                            {video.videoName}
                          </AdminCardTitle>
                          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                            {video.videoDescription?.trim() ||
                              video.content.category.description}
                          </p>
                        </div>
                        <AdminRowMenu>
                          <AdminRowMenuItem
                            onClick={() => {
                              window.open(
                                `/content/${video.id}`,
                                "_blank",
                                "noopener,noreferrer",
                              );
                            }}
                          >
                            <Play className="h-4 w-4" /> Preview
                          </AdminRowMenuItem>
                          <AdminRowMenuItem
                            onClick={() =>
                              setInspectMeta({ video, tab: "themes" })
                            }
                          >
                            <Tags className="h-4 w-4" /> Tags
                          </AdminRowMenuItem>
                          <AdminRowMenuItem
                            onClick={() =>
                              setInspectMeta({ video, tab: "levels" })
                            }
                          >
                            <Layers className="h-4 w-4" /> Genres / level
                          </AdminRowMenuItem>
                          <AdminRowMenuItem
                            onClick={() =>
                              setInspectMeta({ video, tab: "subs" })
                            }
                          >
                            <Captions className="h-4 w-4" /> Subtitles
                          </AdminRowMenuItem>
                          <AdminRowMenuItem onClick={() => openEdit(video)}>
                            <Edit className="h-4 w-4" /> Edit
                          </AdminRowMenuItem>
                          <AdminRowMenuItem
                            onClick={() => navigate("/admin/analytics")}
                          >
                            <BarChart3 className="h-4 w-4" /> Analytics
                          </AdminRowMenuItem>
                          <AdminRowMenuItem
                            danger
                            onClick={() => setDeleteCandidate(video)}
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </AdminRowMenuItem>
                        </AdminRowMenu>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <AdminBadge variant="secondary">{lvl}</AdminBadge>
                        <AdminBadge variant="outline">
                          {video.content.category.name}
                        </AdminBadge>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-border border-t pt-4">
                        <span className="flex min-w-[4rem] items-center gap-1 text-sm text-muted-foreground">
                          <Eye className="h-4 w-4" />
                          {watchers.toLocaleString()}
                        </span>
                        <div className="flex max-w-[120px] flex-1 items-center gap-2">
                          <AdminProgress value={ratingProgress(rating)} />
                          <span className="text-xs whitespace-nowrap text-muted-foreground">
                            {rating > 0 ? rating.toFixed(1) : "—"}
                          </span>
                        </div>
                        <AdminButton
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteCandidate(video)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </AdminButton>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!loading ? (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Showing {filtered.length} of {videos.length}
            </p>
          ) : null}
        </AdminCardContent>
      </AdminCard>
    </div>
  );
}
