import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma.service"; // Укажи свой путь
import {
  CreateConstellationDto,
  CreateStarDto,
  UpdateConstellationDto,
  UpdateStarDto,
} from "./dto/constellation.dto";
import { normalize_star_questions } from "./test-question.validator";
import { StarContentGeneratorService } from "./star-content-generator.service";
import { ConstellationGeneratorService } from "./constellation-generator.service";
import {
  get_content_status,
  is_star_content_ready,
  read_star_metadata,
  StarContentStatus,
} from "./star-content.util";

@Injectable()
export class ConstellationService {
  private readonly logger = new Logger(ConstellationService.name);
  private readonly activeUserGenerations = new Map<number, Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly starContentGenerator: StarContentGeneratorService,
    private readonly generatorService: ConstellationGeneratorService,
  ) { }

  async createConstellation(data: CreateConstellationDto) {
    return this.prisma.constellation.create({ data });
  }

  async getAllConstellations() {
    return this.prisma.constellation.findMany({
      include: {
        stars: { orderBy: { id: "asc" } },
      },
    });
  }

  /**
   * Learner-facing list: only constellations owned by this user.
   * If user has no constellations, auto-generates personal constellation.
   */
  async getConstellationsForUser(userId: number) {
    let constellations = await this.prisma.constellation.findMany({
      where: { userId },
      include: {
        stars: { orderBy: { id: "asc" } },
      },
    });

    if (constellations.length === 0) {
      const existingPromise = this.activeUserGenerations.get(userId);
      if (existingPromise) {
        await existingPromise;
      } else {
        const generationPromise = (async () => {
          try {
            const profile = await this.prisma.additionalUserData.findUnique({
              where: { userId },
              select: { englishLevel: true },
            });
            const cefrLevel = profile?.englishLevel?.trim() || "A1";
            await this.generatorService.ensurePersonalConstellationForUser(userId, cefrLevel);
          } catch (error) {
            this.logger.error(
              `Auto-generating constellation for user ${userId} failed: ${error instanceof Error ? error.message : String(error)}`,
            );
          } finally {
            this.activeUserGenerations.delete(userId);
          }
        })();
        this.activeUserGenerations.set(userId, generationPromise);
        await generationPromise;
      }

      constellations = await this.prisma.constellation.findMany({
        where: { userId },
        include: {
          stars: { orderBy: { id: "asc" } },
        },
      });
    }

    return constellations;
  }

  async getConstellationById(id: number) {
    const constellation = await this.prisma.constellation.findUnique({
      where: { id },
      include: {
        stars: {
          include: { prerequisites: true },
        },
      },
    });
    if (!constellation) throw new NotFoundException("Constellation not found");
    return constellation;
  }

  async updateConstellation(id: number, data: UpdateConstellationDto) {
    try {
      return await this.prisma.constellation.update({
        where: { id },
        data,
      });
    } catch {
      throw new NotFoundException("Constellation not found");
    }
  }

  async deleteConstellation(id: number) {
    try {
      return await this.prisma.constellation.delete({
        where: { id },
      });
    } catch {
      throw new NotFoundException("Constellation not found");
    }
  }

  async createStar(data: CreateStarDto & { prerequisiteIds?: number[] }) {
    const { prerequisiteIds, ...restData } = data;

    return this.prisma.star.create({
      data: {
        ...restData,
        prerequisites: prerequisiteIds?.length
          ? {
            create: prerequisiteIds.map((id) => ({
              prerequisiteId: id,
            })),
          }
          : undefined,
      },
    });
  }

  async updateStar(id: number, data: UpdateStarDto) {
    const { prerequisiteIds, ...restData } = data;

    try {
      return await this.prisma.star.update({
        where: { id },
        data: {
          ...restData,
          ...(prerequisiteIds !== undefined && {
            prerequisites: {
              deleteMany: {},
              create: prerequisiteIds.map((prereqId) => ({
                prerequisiteId: prereqId,
              })),
            },
          }),
        },
        include: {
          prerequisites: true,
        },
      });
    } catch (error) {
      throw new NotFoundException(
        "Star not found or invalid prerequisite IDs provided",
      );
    }
  }
  async deleteStar(id: number) {
    try {
      return await this.prisma.star.delete({
        where: { id },
      });
    } catch {
      throw new NotFoundException("Star not found");
    }
  }

  async getStarById(id: number) {
    await this.starContentGenerator.ensure_star_content(id);
    const star = await this.prisma.star.findUnique({
      where: { id },
    });
    if (!star) throw new NotFoundException("Star not found");
    const metadata =
      typeof star.metadata === "object" && star.metadata !== null
        ? (star.metadata as Record<string, unknown>)
        : undefined;
    const normalizedQuestions = normalize_star_questions(
      metadata,
      star.contentVideoId,
    );
    const contentReady = is_star_content_ready(star.type, metadata);
    const contentStatus = contentReady
      ? StarContentStatus.READY
      : get_content_status(read_star_metadata(metadata));
    return {
      ...star,
      normalizedQuestions,
      contentStatus,
      contentReady,
    };
  }
}
