/**
 * Helpers for `GET /contents/series/:friendlyLink` (ordered episodes in a series).
 */

export type SeriesPlaylistEpisode = {
  index: number;
  contentVideoId: number;
  videoName: string;
  videoDescription: string | null;
  thumbnailUrl: string | null;
};

export type SeriesPlaylistPayload = {
  contentId: number;
  friendlyLink: string;
  name: string;
  description: string;
  episodes: SeriesPlaylistEpisode[];
};

type ApiContentVideo = {
  id?: number;
  videoName?: string;
  videoDescription?: string | null;
  thumbnailUrl?: string | null;
  playlistPosition?: number;
};

type ApiContentMedia = {
  id?: number;
  playlistPosition?: number;
  ContentVideo?: ApiContentVideo[];
};

type ApiSeriesBody = {
  id?: number;
  friendlyLink?: string;
  name?: string;
  description?: string;
  category?: ApiContentMedia[];
};

/**
 * Parses API JSON into a flat ordered episode list (series → media slots → clips).
 */
export function parseSeriesPlaylistPayload(
  body: unknown,
): SeriesPlaylistPayload | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return null;
  }
  const o = body as ApiSeriesBody;
  const contentId = typeof o.id === "number" ? o.id : null;
  const friendlyLink =
    typeof o.friendlyLink === "string" ? o.friendlyLink.trim() : "";
  const name = typeof o.name === "string" ? o.name : "";
  const description = typeof o.description === "string" ? o.description : "";
  if (contentId == null || !friendlyLink) {
    return null;
  }
  const slots = Array.isArray(o.category) ? o.category : [];
  const sortedSlots = [...slots].sort((a, b) => {
    const pa =
      typeof a.playlistPosition === "number" ? a.playlistPosition : 0;
    const pb =
      typeof b.playlistPosition === "number" ? b.playlistPosition : 0;
    if (pa !== pb) return pa - pb;
    return (typeof a.id === "number" ? a.id : 0) -
      (typeof b.id === "number" ? b.id : 0);
  });
  const episodes: SeriesPlaylistEpisode[] = [];
  let index = 0;
  for (const slot of sortedSlots) {
    const videos = Array.isArray(slot.ContentVideo) ? slot.ContentVideo : [];
    const sortedVideos = [...videos].sort((a, b) => {
      const pa =
        typeof a.playlistPosition === "number" ? a.playlistPosition : 0;
      const pb =
        typeof b.playlistPosition === "number" ? b.playlistPosition : 0;
      if (pa !== pb) return pa - pb;
      return (typeof a.id === "number" ? a.id : 0) -
        (typeof b.id === "number" ? b.id : 0);
    });
    for (const v of sortedVideos) {
      const vid = typeof v.id === "number" ? v.id : null;
      if (vid == null) continue;
      index += 1;
      episodes.push({
        index,
        contentVideoId: vid,
        videoName:
          typeof v.videoName === "string" && v.videoName.trim().length > 0 ?
            v.videoName
            : `Episode ${index}`,
        videoDescription:
          typeof v.videoDescription === "string" ? v.videoDescription
          : v.videoDescription === null ? null
          : null,
        thumbnailUrl:
          typeof v.thumbnailUrl === "string" ? v.thumbnailUrl : null,
      });
    }
  }
  return {
    contentId,
    friendlyLink,
    name,
    description,
    episodes,
  };
}
