/**
 * Teacher profile: upload lessons (MP4), set public vs link-only visibility, and view
 * auto-generated caption/tag metadata (read-only — no regeneration in the UI).
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { ExternalLink, Loader2, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch, getResponseErrorMessage } from "../../lib/api";
import { resolveCanonicalUrl } from "../../lib/siteUrl";
import { ProfileCard } from "./ProfileCard";
import Button from "../Button";
import InputText from "../InputText";

/**
 * One series row returned by `GET /contents/teacher/my-series`.
 */
export interface TeacherSeriesRow {
  contentId: number;
  name: string;
  friendlyLink: string;
  visibility: string;
  contentVideoId: number | null;
  captionsReady: boolean;
  systemTags: string[];
  userTags: string[];
  processingComplexity: number | null;
}

function isTeacherSeriesRow(value: unknown): value is TeacherSeriesRow {
  if (!value || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  if (
    typeof o.contentId !== "number" ||
    typeof o.name !== "string" ||
    typeof o.friendlyLink !== "string" ||
    typeof o.visibility !== "string"
  ) {
    return false;
  }
  const cv = o.contentVideoId;
  if (cv != null && typeof cv !== "number") return false;
  if (typeof o.captionsReady !== "boolean") return false;
  if (!Array.isArray(o.systemTags) || !Array.isArray(o.userTags)) return false;
  const pc = o.processingComplexity;
  if (pc != null && typeof pc !== "number") return false;
  return true;
}

export function ProfileTeacherVideos() {
  const [series, setSeries] = useState<TeacherSeriesRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const loadSeries = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await apiFetch("/contents/teacher/my-series", {
        method: "GET",
      });
      if (!res.ok) {
        toast.error(await getResponseErrorMessage(res));
        setSeries([]);
        return;
      }
      const raw: unknown = await res.json();
      if (!Array.isArray(raw)) {
        setSeries([]);
        return;
      }
      setSeries(raw.filter(isTeacherSeriesRow));
    } catch (e) {
      console.error(e);
      toast.error("Could not load your lessons.");
      setSeries([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void loadSeries();
  }, [loadSeries]);

  const submitUpload = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Enter a title for the lesson.");
      return;
    }
    if (!file) {
      toast.error("Choose an MP4 file.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("name", trimmed);
      form.append("visibility", visibility);
      form.append("file", file);
      const res = await apiFetch("/contents/teacher/upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        toast.error(await getResponseErrorMessage(res));
        return;
      }
      const body: unknown = await res.json();
      const captionsReady =
        body &&
        typeof body === "object" &&
        (body as { captionsReady?: unknown }).captionsReady === true;
      toast.success(
        captionsReady
          ? "Lesson uploaded. Subtitles and tags are ready."
          : "Lesson uploaded. Subtitles could not be generated automatically — check API configuration.",
      );
      setTitle("");
      setFile(null);
      await loadSeries();
    } catch (e) {
      console.error(e);
      toast.error("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }, [file, loadSeries, title, visibility]);

  const patchRowVisibility = useCallback(
    async (contentId: number, next: "public" | "unlisted") => {
      try {
        const res = await apiFetch(
          `/contents/teacher/${contentId}/visibility`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visibility: next }),
          },
        );
        if (!res.ok) {
          toast.error(await getResponseErrorMessage(res));
          return;
        }
        toast.success("Visibility updated.");
        await loadSeries();
      } catch (e) {
        console.error(e);
        toast.error("Could not update visibility.");
      }
    },
    [loadSeries],
  );

  return (
    <div className="space-y-6">
      <ProfileCard
        title={
          <span className="flex items-center gap-2">
            <UploadCloud className="size-5 text-primary" />
            Upload a lesson
          </span>
        }
      >
        <p className="mb-6 text-sm text-muted-foreground">
          Upload an MP4. Subtitles and level/theme tags are generated automatically
          from the audio — you cannot re-run generation from here. Choose whether the
          lesson appears in the global catalog for all subscribers or is only available
          via a direct link.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium text-foreground">Title</span>
            <InputText
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lesson title"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Privacy</span>
            <select
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-foreground"
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as "public" | "unlisted")
              }
            >
              <option value="public">Open — listed in catalog</option>
              <option value="unlisted">By link only — not in catalog</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-foreground">Video file</span>
            <input
              type="file"
              accept="video/mp4"
              className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-secondary file:px-3 file:py-2 file:text-sm file:text-foreground"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end">
          <Button
            type="button"
            className="rounded-[15px] w-50 bg-primary px-6 py-3.5 text-sm font-semibold text-foreground/70 hover:bg-purple-hover hover:text-white transition-all hover:cursor-pointer shadow-[inset_0_4px_12px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.3)]6"
            disabled={uploading}
            onClick={() => void submitUpload()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UploadCloud className="size-4" />
            )}
            {uploading ? "Uploading…" : "Upload lesson"}
          </Button>
        </div>
      </ProfileCard>

      <ProfileCard title="Your lessons">
        {loadingList ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : series.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No uploads yet. Add an MP4 above.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {series.map((row) => {
              const sharePath = `/catalog/series/${encodeURIComponent(row.friendlyLink)}`;
              const shareUrl = resolveCanonicalUrl(sharePath);
              return (
                <li key={row.contentId} className="py-5 first:pt-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="font-medium text-foreground">{row.name}</p>
                      <p className="text-xs text-muted-foreground break-all">
                        {shareUrl}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Link
                          to={sharePath}
                          className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
                        >
                          Open playlist
                          <ExternalLink className="size-3.5" />
                        </Link>
                      </div>
                    </div>
                    <label className="shrink-0 space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Privacy
                      </span>
                      <select
                        className="w-full min-w-[12rem] rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground"
                        value={
                          row.visibility === "unlisted" ? "unlisted" : "public"
                        }
                        onChange={(e) =>
                          void patchRowVisibility(
                            row.contentId,
                            e.target.value as "public" | "unlisted",
                          )
                        }
                      >
                        <option value="public">Catalog</option>
                        <option value="unlisted">Link only</option>
                      </select>
                    </label>
                  </div>
                  <div className="mt-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Subtitles:{" "}
                    </span>
                    {row.captionsReady ? "Ready" : "Not available yet"}
                  </div>
                  {(row.systemTags.length > 0 || row.userTags.length > 0) && (
                    <div className="mt-2 space-y-1 text-sm">
                      {row.systemTags.length > 0 ? (
                        <p>
                          <span className="font-medium text-foreground">
                            Level tags:{" "}
                          </span>
                          {row.systemTags.join(", ")}
                        </p>
                      ) : null}
                      {row.userTags.length > 0 ? (
                        <p>
                          <span className="font-medium text-foreground">
                            Theme tags:{" "}
                          </span>
                          {row.userTags.join(", ")}
                        </p>
                      ) : null}
                      {row.processingComplexity != null ? (
                        <p>
                          <span className="font-medium text-foreground">
                            Processing estimate:{" "}
                          </span>
                          {row.processingComplexity}
                        </p>
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </ProfileCard>
    </div>
  );
}
