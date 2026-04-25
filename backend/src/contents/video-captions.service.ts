import {
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { webvtt } from "@deepgram/captions";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { PrismaService } from "src/prisma.service";
import { publicS3ObjectUrl } from "src/common/s3-key.util";
import { VideoTranscriptTagsService } from "./video-transcript-tags.service";

const DEEPGRAM_LISTEN = "https://api.deepgram.com/v1/listen";

@Injectable()
export class VideoCaptionsService {
  private readonly logger = new Logger(VideoCaptionsService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly videoTranscriptTags: VideoTranscriptTagsService,
  ) {
    this.bucket = this.configService.getOrThrow<string>("AWS_S3_BUCKET_NAME");
    this.region =
      this.configService.get<string>("AWS_S3_REGION") ??
      this.configService.getOrThrow<string>("AWS_REGION");
    this.s3Client = new S3Client({ region: this.region });
  }

  /**
   * Transcribe the content video via Deepgram (pre-recorded URL), format WebVTT with
   * `@deepgram/captions`, upload `.vtt` to S3, upsert `VideoCaptions`.
   */
  async generateCaptions(contentVideoId: number) {
    const apiKey = this.configService.get<string>("DEEPGRAM_API_KEY");
    if (!apiKey?.trim()) {
      this.logger.warn(
        "DEEPGRAM_API_KEY is not set; skipping WebVTT caption generation",
      );
      return null;
    }

    const video = await this.prisma.contentVideo.findUnique({
      where: { id: contentVideoId },
    });
    if (!video) {
      throw new NotFoundException(
        `ContentVideo with ID ${contentVideoId} not found`,
      );
    }

    return this.transcribeUploadAndSave(
      contentVideoId,
      video.videoLink,
      apiKey.trim(),
    );
  }

  private async transcribeUploadAndSave(
    contentVideoId: number,
    videoUrl: string,
    apiKey: string,
  ) {

    const params = new URLSearchParams({
      model: "nova-2",
      smart_format: "true",
      utterances: "true",
      punctuate: "true",
    });

    const dgRes = await fetch(`${DEEPGRAM_LISTEN}?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: videoUrl }),
    });

    const dgText = await dgRes.text();
    if (!dgRes.ok) {
      throw new Error(
        `Deepgram error ${dgRes.status}: ${dgText.slice(0, 500)}`,
      );
    }

    let dgJson: unknown;
    try {
      dgJson = JSON.parse(dgText) as unknown;
    } catch {
      throw new Error("Deepgram returned non-JSON body");
    }

    const vtt = webvtt(dgJson);
    if (!vtt?.trim()) {
      throw new Error("WebVTT generation produced empty output");
    }

    const existing = await this.prisma.videoCaptions.findUnique({
      where: { contentVideoId },
    });
    if (existing?.subtitlesFileLink) {
      await this.deleteS3ObjectByPublicUrl(existing.subtitlesFileLink);
    }

    const key = `uploads/captions/${randomUUID()}.vtt`;
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: Buffer.from(vtt, "utf8"),
        ContentType: "text/vtt; charset=utf-8",
      }),
    );

    const subtitlesFileLink = publicS3ObjectUrl(this.bucket, this.region, key);

    const row = await this.prisma.videoCaptions.upsert({
      where: { contentVideoId },
      create: {
        contentVideoId,
        subtitlesFileLink,
      },
      update: {
        subtitlesFileLink,
      },
    });

    try {
      await this.videoTranscriptTags.generateAndAppendTagsForContentVideo(
        contentVideoId,
      );
    } catch (e) {
      this.logger.warn(
        `Tag generation from captions failed for ContentVideo ${contentVideoId}: ${String(
          e,
        )}`,
      );
    }

    return row;
  }

  private async deleteS3ObjectByPublicUrl(url: string): Promise<void> {
    try {
      const u = new URL(url);
      const key = u.pathname.replace(/^\//, "");
      if (!key) return;
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: decodeURIComponent(key),
        }),
      );
    } catch (e) {
      this.logger.warn(
        `Failed to delete old caption object from S3: ${String(e)}`,
      );
    }
  }
}
