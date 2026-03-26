import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateContentMediaDto } from './dto/create-content-media.dto';
import { UpdateContentMediaDto } from './dto/update-content-media.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class ContentMediaService {
  constructor(private prisma: PrismaService) {}

  async create(createContentMediaDto: CreateContentMediaDto) {
    return this.prisma.contentMedia.create({ data: createContentMediaDto });
  }

  async findAll() {
    return this.prisma.contentMedia.findMany();
  }

  async findOne(id: number) {
    const contentMedia = await this.prisma.contentMedia.findUnique({ where: { id } });
    if (!contentMedia) {
      throw new NotFoundException(`ContentMedia with ID ${id} not found`);
    }
    return contentMedia;
  }

  async update(id: number, updateContentMediaDto: UpdateContentMediaDto) {
    const contentMedia = await this.prisma.contentMedia.findUnique({ where: { id } });
    if (!contentMedia) {
      throw new NotFoundException(`ContentMedia with ID ${id} not found`);
    }
    return this.prisma.contentMedia.update({
      where: { id },
      data: updateContentMediaDto,
    });
  }

  async remove(id: number) {
    const contentMedia = await this.prisma.contentMedia.findUnique({ where: { id } });
    if (!contentMedia) {
      throw new NotFoundException(`ContentMedia with ID ${id} not found`);
    }
    return this.prisma.contentMedia.delete({ where: { id } });
  }
}
