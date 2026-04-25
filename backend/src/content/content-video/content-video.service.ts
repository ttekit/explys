import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateContentVideoDto } from "./dto/create-content-video.dto";
import { UpdateContentVideoDto } from "./dto/update-content-video.dto";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class ContentVideoService {
  constructor(private prisma: PrismaService) { }

  async create(createContentVideoDto: CreateContentVideoDto) {
    return this.prisma.contentVideo.create({ data: createContentVideoDto });
  }

  async findAll() {
    return this.prisma.contentVideo.findMany({
      include: {
        content: {
          include: {
            category: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const contentVideo = await this.prisma.contentVideo.findUnique({
      where: { id },
      include: {
        content: {
          include: {
            category: true,
          },
        },
      },
    });
    if (!contentVideo) {
      throw new NotFoundException(`ContentVideo with ID ${id} not found`);
    }
    return contentVideo;
  }

  async update(id: number, updateContentVideoDto: UpdateContentVideoDto) {
    const contentVideo = await this.prisma.contentVideo.findUnique({
      where: { id },
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
    });
    if (!contentVideo) {
      throw new NotFoundException(`ContentVideo with ID ${id} not found`);
    }
    return this.prisma.contentVideo.delete({ where: { id } });
  }
}