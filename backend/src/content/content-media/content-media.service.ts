import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateContentMediaDto } from "./dto/create-content-media.dto";
import { UpdateContentMediaDto } from "./dto/update-content-media.dto";
import { PrismaService } from "src/prisma.service";

@Injectable()
export class ContentMediaService {
  constructor(private prisma: PrismaService) {}

  async create(createContentMediaDto: CreateContentMediaDto) {
    const { categoryId } = createContentMediaDto;
    const maxRow = await this.prisma.contentMedia.aggregate({
      where: { categoryId },
      _max: { playlistPosition: true },
    });
    const playlistPosition = (maxRow._max.playlistPosition ?? -1) + 1;
    return this.prisma.contentMedia.create({
      data: {
        categoryId,
        playlistPosition,
      },
    });
  }

  async findAll() {
    return this.prisma.contentMedia.findMany();
  }

  async findOne(id: number) {
    const contentMedia = await this.prisma.contentMedia.findUnique({
      where: { id },
    });
    if (!contentMedia) {
      throw new NotFoundException(`ContentMedia with ID ${id} not found`);
    }
    return contentMedia;
  }

  async update(id: number, updateContentMediaDto: UpdateContentMediaDto) {
    const contentMedia = await this.prisma.contentMedia.findUnique({
      where: { id },
    });
    if (!contentMedia) {
      throw new NotFoundException(`ContentMedia with ID ${id} not found`);
    }

    const data: { categoryId?: number } = {};
    if (updateContentMediaDto.categoryId !== undefined) {
      data.categoryId = updateContentMediaDto.categoryId;
    }

    return this.prisma.contentMedia.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    const contentMedia = await this.prisma.contentMedia.findUnique({
      where: { id },
    });
    if (!contentMedia) {
      throw new NotFoundException(`ContentMedia with ID ${id} not found`);
    }
    return this.prisma.contentMedia.delete({ where: { id } });
  }
}
