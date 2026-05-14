import { Injectable, NotFoundException } from "@nestjs/common";
import { generateContentVideoIframe } from "src/common/content-video-iframe.util";
import { PrismaService } from "src/prisma.service";
import { CreateContentVideoDto } from "./dto/create-content-video.dto";
import { UpdateContentVideoDto } from "./dto/update-content-video.dto";

/** Catalog / playlist ordering: series → media slot → clip. */
export function compareContentVideosPlaylistOrder(
  a: {
    id: number;
    playlistPosition: number;
    content: { categoryId: number; playlistPosition: number };
  },
  b: {
    id: number;
    playlistPosition: number;
    content: { categoryId: number; playlistPosition: number };
  },
): number {
  const bySeries = a.content.categoryId - b.content.categoryId;
  if (bySeries !== 0) return bySeries;
  const byMedia = a.content.playlistPosition - b.content.playlistPosition;
  if (byMedia !== 0) return byMedia;
  const byVideo = a.playlistPosition - b.playlistPosition;
  if (byVideo !== 0) return byVideo;
  return a.id - b.id;
}

export const CATALOG_CONTENT_VISIBILITY_PUBLIC = "public" as const;

@Injectable()
export class ContentVideoService {
  constructor(private prisma: PrismaService) { }

  async create(createContentVideoDto: CreateContentVideoDto) {
    const maxRow = await this.prisma.contentVideo.aggregate({
      where: { contentId: createContentVideoDto.contentId },
      _max: { playlistPosition: true },
    });
    const playlistPosition = (maxRow._max.playlistPosition ?? -1) + 1;
    return this.prisma.contentVideo.create({
      data: { ...createContentVideoDto, playlistPosition },
    });
  }

  async findAll() {
    return this.prisma.contentVideo.findMany({
      where: {
        content: {
          category: { visibility: CATALOG_CONTENT_VISIBILITY_PUBLIC },
        },
      },
      orderBy: [
        { content: { categoryId: "asc" } },
        { content: { playlistPosition: "asc" } },
        { playlistPosition: "asc" },
        { id: "asc" },
      ],
      include: {
        videoCaption: {
          select: { subtitlesFileLink: true },
        },
        content: {
          include: {
            category: true,
            stats: {
              include: {
                topics: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
  }

  async findWatchedByUser(userId: number) {
    const sessions = await this.prisma.watchSession.findMany({
      where: { userId },
      orderBy: { endedAt: "desc" },
      select: { contentVideoId: true },
    });

    const orderedIds: number[] = [];
    const seen = new Set<number>();
    for (const s of sessions) {
      if (seen.has(s.contentVideoId)) continue;
      seen.add(s.contentVideoId);
      orderedIds.push(s.contentVideoId);
    }

    if (orderedIds.length === 0) return [];

    const videos = await this.prisma.contentVideo.findMany({
      where: { id: { in: orderedIds } },
      include: {
        videoCaption: { select: { subtitlesFileLink: true } },
        content: {
          include: {
            category: true,
            stats: { include: { topics: { select: { id: true, name: true } } } },
          },
        },
      },
    });

    return videos.sort(compareContentVideosPlaylistOrder);
  }

  /**
   * Latest distinct clips the learner opened (by most recent watch session), with quiz high score when any.
   */
  async findRecentWatchedForUser(userId: number, limit = 8) {
    const safeLimit = Math.min(Math.max(1, limit), 24);
    const takeSessions = Math.min(200, safeLimit * 20);
    const sessions = await this.prisma.watchSession.findMany({
      where: { userId },
      orderBy: { endedAt: "desc" },
      take: takeSessions,
      select: {
        contentVideoId: true,
        endedAt: true,
        completed: true,
        secondsWatched: true,
      },
    });
    const orderedVideoIds: number[] = [];
    const latestSessionByVideo = new Map<
      number,
      {
        endedAt: Date;
        completed: boolean;
        secondsWatched: number;
      }
    >();
    for (const s of sessions) {
      if (latestSessionByVideo.has(s.contentVideoId)) {
        continue;
      }
      latestSessionByVideo.set(s.contentVideoId, {
        endedAt: s.endedAt,
        completed: s.completed,
        secondsWatched: s.secondsWatched ?? 0,
      });
      orderedVideoIds.push(s.contentVideoId);
      if (orderedVideoIds.length >= safeLimit) {
        break;
      }
    }
    if (orderedVideoIds.length === 0) {
      return [];
    }
    const videos = await this.prisma.contentVideo.findMany({
      where: { id: { in: orderedVideoIds } },
      select: {
        id: true,
        videoName: true,
        content: {
          select: {
            category: { select: { name: true, friendlyLink: true } },
          },
        },
      },
    });
    const videoById = new Map(videos.map((v) => [v.id, v]));
    const attempts = await this.prisma.comprehensionTestAttempt.findMany({
      where: { userId, contentVideoId: { in: orderedVideoIds } },
      select: { contentVideoId: true, scorePct: true },
    });
    const bestScoreByVideo = new Map<number, number>();
    for (const a of attempts) {
      const sc = Number(a.scorePct);
      if (!Number.isFinite(sc)) {
        continue;
      }
      const prev = bestScoreByVideo.get(a.contentVideoId);
      if (prev === undefined || sc > prev) {
        bestScoreByVideo.set(a.contentVideoId, sc);
      }
    }
    return orderedVideoIds.flatMap((id) => {
      const v = videoById.get(id);
      const session = latestSessionByVideo.get(id);
      if (!v || !session) {
        return [];
      }
      const bestRaw = bestScoreByVideo.get(id);
      const bestScorePct =
        bestRaw !== undefined
          ? Math.round(Number(bestRaw) * 10) / 10
          : null;
      return [
        {
          contentVideoId: id,
          videoName: v.videoName,
          seriesName: v.content.category.name,
          seriesFriendlyLink: v.content.category.friendlyLink,
          lastWatchedAt: session.endedAt.toISOString(),
          completed: session.completed,
          secondsWatched: session.secondsWatched,
          bestScorePct,
        },
      ];
    });
  }

  async findOne(id: number) {
    const contentVideo = await this.prisma.contentVideo.findUnique({
      where: { id },
      include: {
        videoCaption: { select: { subtitlesFileLink: true } },
        content: {
          include: {
            category: true,
            stats: { include: { topics: { select: { id: true, name: true } } } },
          },
        },
      },
    });
    if (!contentVideo) {
      throw new NotFoundException(`ContentVideo with ID ${id} not found`);
    }
    return contentVideo;
  }

  async getIframePayload(id: number): Promise<{ iframeHtml: string }> {
    const v = await this.findOne(id);
    const iframeHtml = generateContentVideoIframe(v.videoLink, {
      title: v.videoName,
    });
    return { iframeHtml };
  }

  async update(id: number, updateContentVideoDto: UpdateContentVideoDto) {
    const contentVideo = await this.prisma.contentVideo.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!contentVideo) {
      throw new NotFoundException(`ContentVideo with ID ${id} not found`);
    }
    return this.prisma.contentVideo.update({
      where: { id },
      data: updateContentVideoDto,
    });
  }

  async remove(id: number) {
    const contentVideo = await this.prisma.contentVideo.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!contentVideo) {
      throw new NotFoundException(`ContentVideo with ID ${id} not found`);
    }
    return this.prisma.contentVideo.delete({ where: { id } });
  }
}