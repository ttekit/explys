import {
  BadGatewayException,
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
import { execFile } from "node:child_process";
import type { ExecException } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { randomUUID } from "crypto";
import { PrismaService } from "src/prisma.service";
import { publicS3ObjectUrl } from "src/common/s3-key.util";
import { VideoTranscriptTagsService } from "./video-transcript-tags.service";

const DEEPGRAM_LISTEN = "https://api.deepgram.com/v1/listen";
const execFileAsync = promisify(execFile);

const MIN_WAV_BYTES = 2000; // header + a little PCM; catches empty/failed decodes

type FfmpegAttemptTrace = {
  name: string;
  ok: boolean;
  err?: string;
};

function deepgramCaptionMaxVideoBytes(): number {
  const n = Number(process.env.CONTENT_VIDEO_MAX_FILE_BYTES);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return 100 * 1024 * 1024;
}

/** After FFmpeg PCM extract; default `nova-3` suits pre-recorded WAV. */
function deepgramTranscribeModel(config: ConfigService): string {
  const m = config.get<string>("DEEPGRAM_TRANSCRIBE_MODEL")?.trim();
  return m || "nova-3";
}

function ffmpegBinaryPath(): string {
  const p = process.env.FFMPEG_PATH?.trim();
  if (p) return p;
  // Bundled ffmpeg (see package.json); override with FFMPEG_PATH on restricted hosts.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require("@ffmpeg-installer/ffmpeg") as { path: string }).path;
}

function execErrText(ex: unknown): string {
  const xe = ex as ExecException & { stderr?: string };
  return `${xe.stderr ?? ""}${xe.stderr ? "\n" : ""}${xe.message ?? String(ex)}`.slice(
    0,
    1500,
  );
}

async function ffmpegRun(bin: string, args: string[]): Promise<void> {
  await execFileAsync(bin, args, {
    maxBuffer: 12 * 1024 * 1024,
    encoding: "utf8",
  });
}

/**
 * MP4 AAC in the wild sometimes trips FFmpeg's demuxer/dec (HE-AAC, sparse tracks).
 * Try default audio selection / alternate `-map 0:a:n` / ADTS copy then decode — with tolerant input flags.
 */
async function extractMp4AudioToPcmWav(args: {
  ffmpegBin: string;
  mp4Path: string;
  tmpDir: string;
}): Promise<{ wavBuf: Buffer; trace: FfmpegAttemptTrace[] }> {
  const { ffmpegBin, mp4Path, tmpDir } = args;
  const trace: FfmpegAttemptTrace[] = [];

  const robustPrefix = (): string[] => [
    "-hide_banner",
    "-loglevel",
    "error",
    "-nostdin",
    "-y",
    "-fflags",
    "+discardcorrupt",
    "-err_detect",
    "ignore_err",
    "-i",
    mp4Path,
  ];

  const wavSuffix = (wavPath: string, mapMiddle: string[]): string[] =>
    [
      ...robustPrefix(),
      ...mapMiddle,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-acodec",
      "pcm_s16le",
      "-f",
      "wav",
      wavPath,
    ];

  const pushFail = (a: FfmpegAttemptTrace, ex: unknown) => {
    a.err = execErrText(ex).slice(0, 450);
    trace.push(a);
  };

  const finishIfValidWav = async (
    wavPath: string,
    meta: Omit<FfmpegAttemptTrace, "ok" | "err">,
  ): Promise<Buffer | null> => {
    let buf: Buffer;
    try {
      buf = await readFile(wavPath);
    } finally {
      await rm(wavPath, { force: true }).catch(() => {});
    }
    if (buf.length < MIN_WAV_BYTES) {
      trace.push({
        ...meta,
        ok: false,
        err: `WAV too small (${buf.length} B)`,
      });
      return null;
    }
    trace.push({ ...meta, ok: true });
    return buf;
  };

  // Default stream selection (may differ from `-map 0:a:0`).
  {
    const wavPath = join(tmpDir, `pcm-${randomUUID()}.wav`);
    const meta = { name: "direct-default-audio" } as const;
    try {
      await ffmpegRun(
        ffmpegBin,
        wavSuffix(wavPath, []),
      );
      const buf = await finishIfValidWav(wavPath, meta);
      if (buf) return { wavBuf: buf, trace };
    } catch (ex) {
      pushFail({ ...meta, ok: false }, ex);
    }
  }

  // Explicit `0:a:n` with tolerant demux/decode.
  for (let idx = 0; idx < 4; idx++) {
    const wavPath = join(tmpDir, `pcm-${randomUUID()}.wav`);
    const meta = { name: `direct-map-0:a:${idx}` } as const;
    try {
      await ffmpegRun(ffmpegBin, wavSuffix(wavPath, ["-map", `0:a:${idx}`]));
      const buf = await finishIfValidWav(wavPath, meta);
      if (buf) return { wavBuf: buf, trace };
    } catch (ex) {
      pushFail({ ...meta, ok: false }, ex);
    }
  }

  // ADTS copy then decode — avoids some broken MP4 AAC framing.
  for (let idx = 0; idx < 4; idx++) {
    const aacPath = join(tmpDir, `raw-${randomUUID()}.aac`);
    const wavPath = join(tmpDir, `pcm-${randomUUID()}.wav`);
    const meta = { name: `adts-then-pcm-0:a:${idx}` } as const;
    try {
      await ffmpegRun(ffmpegBin, [
        ...robustPrefix(),
        "-map",
        `0:a:${idx}`,
        "-vn",
        "-c:a",
        "copy",
        "-f",
        "adts",
        aacPath,
      ]);
      await ffmpegRun(ffmpegBin, [
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-y",
        "-fflags",
        "+discardcorrupt",
        "-err_detect",
        "ignore_err",
        "-i",
        aacPath,
        "-ac",
        "1",
        "-ar",
        "16000",
        "-acodec",
        "pcm_s16le",
        "-f",
        "wav",
        wavPath,
      ]);
      await rm(aacPath, { force: true }).catch(() => {});
      const buf = await finishIfValidWav(wavPath, meta);
      if (buf) return { wavBuf: buf, trace };
    } catch (ex) {
      await rm(aacPath, { force: true }).catch(() => {});
      await rm(wavPath, { force: true }).catch(() => {});
      pushFail({ ...meta, ok: false }, ex);
    }
  }

  return { wavBuf: Buffer.alloc(0), trace };
}

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
   * Download MP4 from `videoLink`, FFmpeg → 16 kHz mono PCM WAV, Deepgram Listen → WebVTT → S3.
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
      omit: { comprehensionTestsCache: true },
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
    const dgModel = deepgramTranscribeModel(this.configService);

    const params = new URLSearchParams({
      model: dgModel,
      smart_format: "true",
      utterances: "true",
      punctuate: "true",
    });

    const maxBytes = deepgramCaptionMaxVideoBytes();
    const videoUp = await fetch(videoUrl, { signal: AbortSignal.timeout(600_000) });
    if (!videoUp.ok) {
      throw new Error(
        `Failed to download video for Deepgram: HTTP ${videoUp.status}`,
      );
    }
    const reportedCl = videoUp.headers.get("content-length");
    if (reportedCl != null && Number(reportedCl) > maxBytes) {
      throw new Error(
        `Video Content-Length ${reportedCl} exceeds max ${maxBytes} bytes`,
      );
    }
    const videoBuf = Buffer.from(await videoUp.arrayBuffer());
    if (videoBuf.length > maxBytes) {
      throw new Error(
        `Video size ${videoBuf.length} exceeds max ${maxBytes} bytes`,
      );
    }

    const ffmpegBin = ffmpegBinaryPath();
    const tmpDir = await mkdtemp(join(tmpdir(), "exply-caption-"));
    const mp4Path = join(tmpDir, `source-${randomUUID()}.mp4`);

    await writeFile(mp4Path, videoBuf);

    let wavBuf: Buffer;
    try {
      const { wavBuf: extracted, trace } = await extractMp4AudioToPcmWav({
        ffmpegBin,
        mp4Path,
        tmpDir,
      });
      wavBuf = extracted;

      if (wavBuf.length < MIN_WAV_BYTES) {
        const hint =
          process.env.FFMPEG_PATH?.trim() ?
            ""
            : " Try setting FFMPEG_PATH to a newer ffmpeg build.";
        const tail = trace
          .slice(-4)
          .map((t) => `${t.name}${t.err ? `: ${t.err.slice(0, 120)}` : ""}`)
          .join(" | ");
        throw new Error(
          `FFmpeg audio extract failed after ${trace.length} attempts.${hint} ${tail}`,
        );
      }
    } finally {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }

    const dgRes = await fetch(`${DEEPGRAM_LISTEN}?${params.toString()}`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "audio/wav",
      },
      body: new Uint8Array(wavBuf),
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

  /** Load WebVTT text from S3 URL stored on `VideoCaptions` (same-origin admin proxy). */
  async fetchStoredSubtitlesVtt(contentVideoId: number): Promise<string> {
    const row = await this.prisma.videoCaptions.findUnique({
      where: { contentVideoId },
      select: { subtitlesFileLink: true },
    });
    const url = row?.subtitlesFileLink?.trim();
    if (!url) {
      throw new NotFoundException(
        `No captions row for ContentVideo ${contentVideoId}`,
      );
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) {
      throw new BadGatewayException(
        `Subtitles URL returned HTTP ${res.status}`,
      );
    }
    return res.text();
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
