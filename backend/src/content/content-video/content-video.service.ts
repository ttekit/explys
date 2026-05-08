import { Injectable, NotFoundException } from "@nestjs/common";
import { generateContentVideoIframe } from "src/common/content-video-iframe.util";
import { PrismaService } from "src/prisma.service";
import { CreateContentVideoDto } from "./dto/create-content-video.dto";
import { UpdateContentVideoDto } from "./dto/update-content-video.dto";

@Injectable()
export class ContentVideoService {
  constructor(private prisma: PrismaService) { }

  async create(createContentVideoDto: CreateContentVideoDto) {
    return this.prisma.contentVideo.create({ data: createContentVideoDto });
  }

  async findAll() {
    return this.prisma.contentVideo.findMany({
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

  /**
   * Unique videos the learner has completed a watch session for, most recently watched first.
   */
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
    if (orderedIds.length === 0) {
      return [];
    }
    const videos = await this.prisma.contentVideo.findMany({
      where: { id: { in: orderedIds } },
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
    const rank = new Map(orderedIds.map((id, i) => [id, i]));
    return videos.sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  }

  async findOne(id: number) {
    const contentVideo = await this.prisma.contentVideo.findUnique({
      where: { id },
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
    if (!contentVideo) {
      throw new NotFoundException(`ContentVideo with ID ${id} not found`);
    }
    return contentVideo;
  }

  /** HTML iframe snippet for embedding the raw `videoLink` in docs or test UIs. */
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