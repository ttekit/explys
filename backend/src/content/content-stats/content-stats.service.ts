import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateContentStatsDto } from "./dto/create-content-stats.dto";
import { UpdateContentStatsDto } from "./dto/update-content-stats.dto";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class ContentStatsService {
  constructor(private prisma: PrismaService) {}

  async create(createContentStatsDto: CreateContentStatsDto) {
    const { topicIds, ...rest } = createContentStatsDto;
    return this.prisma.contentStats.create({
      data: {
        ...rest,
        topics: {
          connect: topicIds?.map((id) => ({ id })),
        },
      },
      include: {
        topics: true,
      },
    });
  }

  async findAll() {
    return this.prisma.contentStats.findMany({
      include: {
        topics: true,
      },
    });
  }

  async findOne(id: number) {
    const contentStats = await this.prisma.contentStats.findUnique({
      where: { id },
      include: {
        topics: true,
      },
    });
    if (!contentStats) {
      throw new NotFoundException(`ContentStats with ID ${id} not found`);
    }
    return contentStats;
  }

  async update(id: number, updateContentStatsDto: UpdateContentStatsDto) {
    const { topicIds, ...rest } = updateContentStatsDto;
    const contentStats = await this.prisma.contentStats.findUnique({
      where: { id },
    });
    if (!contentStats) {
      throw new NotFoundException(`ContentStats with ID ${id} not found`);
    }

    return this.prisma.contentStats.update({
      where: { id },
      data: {
        ...rest,
        topics: {
          set: topicIds?.map((id) => ({ id })), // Disconnects existing and connects new ones
        },
      },
      include: {
        topics: true,
      },
    });
  }

  async remove(id: number) {
    const contentStats = await this.prisma.contentStats.findUnique({
      where: { id },
    });
    if (!contentStats) {
      throw new NotFoundException(`ContentStats with ID ${id} not found`);
    }
    return this.prisma.contentStats.delete({ where: { id } });
  }
}
