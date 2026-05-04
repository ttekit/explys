import { adminApiFetch, readApiErrorBody } from "./api";

/** GET /content-video row shape when `stats` included (admin + catalog). */
export type AdminCatalogVideoRow = {
  id: number;
  videoName: string;
  videoDescription: string | null;
  videoLink: string;
  videoCaption: { subtitlesFileLink: string } | null;
  content: {
    id: number;
    categoryId: number;
    category: {
      id: number;
      name: string;
      description: string;
      friendlyLink: string;
    };
    stats: {
      usersWatched: number;
      rating: number;
      systemTags: string[];
      userTags: string[];
      processingComplexity: number | null;
    } | null;
  };
};

export async function fetchAdminCatalogVideos(): Promise<AdminCatalogVideoRow[]> {
  const res = await adminApiFetch("/content-video", { method: "GET" });
  if (!res.ok) {
    throw new Error(await readApiErrorBody(res));
  }
  return (await res.json()) as AdminCatalogVideoRow[];
}

const CEFR = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

/** First CEFR token in stats tags for filters / badges (best-effort). */
export function videoLevelBadge(v: AdminCatalogVideoRow): string {
  const tags = v.content.stats?.systemTags ?? [];
  const upper = tags.map((t) => t.toUpperCase());
  for (const c of CEFR) {
    if (upper.some((t) => t.includes(c))) return c;
  }
  return tags[0]?.trim() || "—";
}

export function matchesVideoLevelFilter(
  row: AdminCatalogVideoRow,
  filter: string,
): boolean {
  if (filter === "all") return true;
  const badge = videoLevelBadge(row);
  if (filter === "__misc") {
    const known = new Set<string>([...CEFR]);
    return badge === "—" || !known.has(badge);
  }
  return badge === filter;
}

export type PatchContentVideoPayload = {
  videoName?: string;
  videoDescription?: string | null;
  videoLink?: string;
};

export async function patchAdminContentVideo(
  contentVideoId: number,
  patch: PatchContentVideoPayload,
): Promise<unknown> {
  const res = await adminApiFetch(`/content-video/${contentVideoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(await readApiErrorBody(res));
  }
  return res.json();
}

/** Deletes catalog root (`Content`) and cascading media/video rows. `contentRootId` is `video.content.category.id`. */
export async function deleteAdminCatalogContent(
  contentRootId: number,
): Promise<void> {
  const res = await adminApiFetch(`/contents/delete/${contentRootId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(await readApiErrorBody(res));
  }
}

/** Multipart POST /contents/create — field `file`, body name / friendlyLink / description. */
export async function createAdminCatalogVideo(form: FormData): Promise<unknown> {
  const res = await adminApiFetch("/contents/create", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    throw new Error(await readApiErrorBody(res));
  }
  return res.json();
}

export type RegenerateTagsResponse = {
  contentStatsId: number;
  systemTags: string[];
  userTags: string[];
  processingComplexity: number | null;
  geminiFailed: boolean;
};

export async function regenerateAdminVideoThemeTags(
  contentVideoId: number,
): Promise<RegenerateTagsResponse> {
  const res = await adminApiFetch(`/content-video/${contentVideoId}/regenerate-tags`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(await readApiErrorBody(res));
  }
  return (await res.json()) as RegenerateTagsResponse;
}

/** CEFR band / system tags (labeled “genres” in admin UI). */
export async function regenerateAdminVideoLevelTags(
  contentVideoId: number,
): Promise<RegenerateTagsResponse> {
  const res = await adminApiFetch(`/content-video/${contentVideoId}/regenerate-genres`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(await readApiErrorBody(res));
  }
  return (await res.json()) as RegenerateTagsResponse;
}

export type RegenerateCaptionsResponse = {
  ok: true;
  contentVideoId: number;
  subtitlesFileLink: string;
};

export async function regenerateAdminVideoCaptions(
  contentVideoId: number,
): Promise<RegenerateCaptionsResponse> {
  const res = await adminApiFetch(`/content-video/${contentVideoId}/regenerate-captions`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(await readApiErrorBody(res));
  }
  return (await res.json()) as RegenerateCaptionsResponse;
}

/** GET `text/vtt` via API proxy (requires `x-api-token`; avoids browser CORS to S3). */
export async function fetchAdminVideoSubtitlesVtt(contentVideoId: number): Promise<string> {
  const res = await adminApiFetch(`/content-video/${contentVideoId}/subtitles`, {
    method: "GET",
  });
  if (!res.ok) {
    throw new Error(await readApiErrorBody(res));
  }
  return res.text();
}
