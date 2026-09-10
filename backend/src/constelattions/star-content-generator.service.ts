import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma.service";
import {
  ConstellationGeminiClient,
  type GenerateStarContentInput,
} from "./constellation-gemini.client";
import { validate_star_content_metadata } from "./generated-constellation.validator";
import { build_constellation_domain } from "./constellation-domain.util";
import {
  StarContentStatus,
  build_plan_metadata,
  is_star_content_ready,
  merge_star_content_metadata,
  read_star_metadata,
} from "./star-content.util";

const CONTENT_MAX_ATTEMPTS = 3;
const GENERATION_WAIT_MS = 120_000;
const GENERATION_POLL_MS = 500;

/**
 * Lazily generates full star lesson content when a star becomes available.
 */
@Injectable()
export class StarContentGeneratorService {
  private readonly logger = new Logger(StarContentGeneratorService.name);
  private readonly activeGenerations = new Set<number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: ConstellationGeminiClient,
  ) { }

  async ensure_star_content(starId: number): Promise<void> {
    const deadline = Date.now() + GENERATION_WAIT_MS;
    while (Date.now() < deadline) {
      const star = await this.prisma.star.findUnique({
        where: { id: starId },
        include: {
          constellation: {
            include: { user: { include: { additionalUserData: true } } },
          },
        },
      });
      if (!star) {
        throw new NotFoundException("Star not found");
      }
      if (is_star_content_ready(star.type, star.metadata)) {
        return;
      }
      const planMetadata = read_star_metadata(star.metadata);
      const status = planMetadata.contentStatus;
      if (
        status === StarContentStatus.GENERATING ||
        this.activeGenerations.has(starId)
      ) {
        await sleep(GENERATION_POLL_MS);
        continue;
      }
      this.activeGenerations.add(starId);
      await this.prisma.star.update({
        where: { id: starId },
        data: {
          metadata: {
            ...planMetadata,
            contentStatus: StarContentStatus.GENERATING,
          } as object,
        },
      });
      try {
        const content = await this.generate_validated_content(star);
        const merged = merge_star_content_metadata(planMetadata, content);
        await this.prisma.star.update({
          where: { id: starId },
          data: { metadata: merged as object },
        });
        return;
      } catch (error: unknown) {
        await this.prisma.star.update({
          where: { id: starId },
          data: {
            metadata: {
              ...planMetadata,
              contentStatus: StarContentStatus.PENDING,
            } as object,
          },
        });
        throw error;
      } finally {
        this.activeGenerations.delete(starId);
      }
    }
    throw new InternalServerErrorException("Star content generation timed out");
  }

  schedule_star_content(starId: number): void {
    void this.ensure_star_content(starId).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Background content generation failed for star ${starId}: ${message}`);
    });
  }

  private async generate_validated_content(
    star: {
      id: number;
      constellationId: number;
      type: string;
      name: string;
      description: string | null;
      metadata: unknown;
      constellation: {
        user: {
          additionalUserData: {
            englishLevel: string | null;
            learningGoal: string | null;
            workField: string | null;
          } | null;
        } | null;
      };
    },
  ): Promise<Record<string, unknown>> {
    const planMetadata = read_star_metadata(star.metadata);
    const profile = star.constellation.user?.additionalUserData;
    const cefrLevel = profile?.englishLevel?.trim().toUpperCase() || "A1";
    const domain = build_constellation_domain({
      cefrLevel,
      learningGoal: profile?.learningGoal,
      workField: profile?.workField,
    });
    const topicMatch = star.description?.match(/^\[(.*?)\]/);
    const topic = topicMatch?.[1] ?? star.name;
    const plainDescription = star.description?.replace(/^\[.*?\]\s*/, "") ?? "";
    const input: GenerateStarContentInput = {
      starType: star.type,
      starName: star.name,
      starTopic: topic,
      starDescription: plainDescription,
      canDo: typeof planMetadata.canDo === "string" ? planMetadata.canDo : "",
      introducedLemmas: as_string_array(planMetadata.introducedLemmas),
      recycledLemmas: as_string_array(planMetadata.recycledLemmas),
      priorLemmas: await this.collect_prior_lemmas({
        id: star.id,
        constellationId: star.constellationId,
      }),
      learnerCefr: cefrLevel,
      domain,
    };
    
    const segment = await this.find_video_segment_for_star(topic, input.introducedLemmas);
    if (segment) {
      input.videoTranscript = segment.fullPhrase;
    }

    let lastReason = "Unknown failure";
    for (let attempt = 1; attempt <= CONTENT_MAX_ATTEMPTS; attempt += 1) {
      const generated = await this.gemini.generateStarContent(input);
      const metadata = generated?.metadata;
      const validation = validate_star_content_metadata(star.type, metadata);
      if (validation.valid && metadata) {
        if (segment && Array.isArray(metadata.questions)) {
          for (const q of metadata.questions) {
            if (typeof q === "object" && q !== null && (q as any).type === "video_riddle") {
              (q as any).segment = {
                contentVideoId: segment.contentVideoId,
                startTimeSec: segment.startTimeSec,
                endTimeSec: segment.endTimeSec,
              };
            }
          }
        }
        return metadata;
      }
      lastReason = validation.valid ? "Missing metadata" : validation.reason;
      this.logger.warn(
        `Star content validation failed (${attempt}/${CONTENT_MAX_ATTEMPTS}): ${lastReason}`,
      );
    }
    throw new InternalServerErrorException(
      `Failed to generate star content: ${lastReason}`,
    );
  }

  private async collect_prior_lemmas(
    star: { id: number; constellationId: number },
  ): Promise<string[]> {
    const constellation = await this.prisma.constellation.findUnique({
      where: { id: star.constellationId },
      select: { userId: true },
    });
    if (!constellation?.userId) {
      return [];
    }
    const completed = await this.prisma.star.findMany({
      where: {
        constellationId: star.constellationId,
        id: { not: star.id },
        userProgress: {
          some: {
            userId: constellation.userId,
            status: "COMPLETED",
          },
        },
      },
      select: { metadata: true },
    });
    const lemmas = new Set<string>();
    for (const item of completed) {
      const metadata = read_star_metadata(item.metadata);
      for (const lemma of as_string_array(metadata.introducedLemmas)) {
        lemmas.add(lemma);
      }
    }
    return [...lemmas];
  }

  private async find_video_segment_for_star(
    topic: string,
    introducedLemmas: string[],
  ) {
    const keyword = topic.trim().split(/\s+/)[0];
    if (!keyword && introducedLemmas.length === 0) return null;

    const orFilters: any[] = [];
    if (keyword && keyword.length > 3) {
      orFilters.push({ fullPhrase: { contains: keyword, mode: "insensitive" } });
    }
    for (const lemma of introducedLemmas.slice(0, 3)) {
      if (lemma.length > 2) {
        orFilters.push({ fullPhrase: { contains: lemma, mode: "insensitive" } });
      }
    }
    
    if (orFilters.length === 0) return null;

    const segment = await this.prisma.videoSegment.findFirst({
      where: { OR: orFilters },
    });
    return segment;
  }
}

function as_string_array(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export { build_plan_metadata };
