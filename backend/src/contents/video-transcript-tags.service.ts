import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { AlcorythmGeminiTranscriptTagClient } from 'src/alcorythm/alcorythm-gemini-transcript-tags.client';
import { webVttToPlainText } from './webvtt-to-plain-text.util';

export type VideoTranscriptTagsResult = {
  contentStatsId: number;
  systemTags: string[];
  userTags: string[];
  processingComplexity: number | null;
  geminiFailed: boolean;
};

@Injectable()
export class VideoTranscriptTagsService {
  private readonly logger = new Logger(VideoTranscriptTagsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiTranscriptTags: AlcorythmGeminiTranscriptTagClient,
  ) {}

  /**
   * WebVTT → plain text → Gemini: CEFR `systemTags`, theme `userTags`, `processingComplexity` 1–10 on ContentStats.
   */
  async generateAndAppendTagsForContentVideo(
    contentVideoId: number,
  ): Promise<VideoTranscriptTagsResult> {
    const video = await this.prisma.contentVideo.findUnique({
      where: { id: contentVideoId },
      include: { videoCaption: true },
    });
    if (!video) {
      throw new NotFoundException(`ContentVideo with ID ${contentVideoId} not found`);
    }
    const vttUrl = video.videoCaption?.subtitlesFileLink;
    if (!vttUrl?.trim()) {
      throw new BadRequestException(
        'No captions for this video yet. Generate captions first.',
      );
    }

    let vtt: string;
    try {
      const r = await fetch(vttUrl);
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}`);
      }
      vtt = await r.text();
    } catch (e) {
      this.logger.warn(`Failed to fetch VTT for tag generation: ${String(e)}`);
      throw new BadRequestException('Could not load caption file for tagging.');
    }

    const plain = webVttToPlainText(vtt);
    if (plain.length < 20) {
      throw new BadRequestException('Caption text is too short to infer tags.');
    }

    const contentMediaId = video.contentId;

    const metadata = await this.geminiTranscriptTags.analyzeTranscriptMetadata({
      transcriptPlainText: plain,
      videoTitle: video.videoName,
    });

    if (metadata === null) {
      this.logger.warn('GEMINI_API_KEY missing or metadata call failed; ContentStats not updated');
      const existing = await this.prisma.contentStats.findUnique({
        where: { contentMediaId },
      });
      if (existing) {
        return {
          contentStatsId: existing.id,
          systemTags: existing.systemTags,
          userTags: existing.userTags,
          processingComplexity: existing.processingComplexity,
          geminiFailed: true,
        };
      }
      const created = await this.prisma.contentStats.create({
        data: { contentMediaId },
      });
      return {
        contentStatsId: created.id,
        systemTags: created.systemTags,
        userTags: created.userTags,
        processingComplexity: created.processingComplexity,
        geminiFailed: true,
      };
    }

    const updated = await this.prisma.contentStats.upsert({
      where: { contentMediaId },
      create: {
        contentMediaId,
        systemTags: metadata.systemTags,
        userTags: metadata.userTags,
        processingComplexity: metadata.complexity,
      },
      update: {
        systemTags: metadata.systemTags,
        userTags: metadata.userTags,
        processingComplexity: metadata.complexity,
      },
    });

    return {
      contentStatsId: updated.id,
      systemTags: updated.systemTags,
      userTags: updated.userTags,
      processingComplexity: updated.processingComplexity,
      geminiFailed: false,
    };
  }
}
