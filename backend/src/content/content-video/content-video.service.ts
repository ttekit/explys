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
      omit: { comprehensionTestsCache: true },
      include: {
        videoCaption: {
          select: { subtitlesFileLink: true },
        },
        content: {
          include: {
            category: true,
            stats: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const contentVideo = await this.prisma.contentVideo.findUnique({
      where: { id },
      omit: { comprehensionTestsCache: true },
      include: {
        videoCaption: {
          select: { subtitlesFileLink: true },
        },
        content: {
          include: {
            category: true,
            stats: true,
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