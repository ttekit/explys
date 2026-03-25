import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async create(createTagDto: CreateTagDto) {
    const { name } = createTagDto;

    const tagExists = await this.prisma.tag.findUnique({ where: { name } });
    if (tagExists) {
      throw new ConflictException('Tag with this name already exists');
    }

    return this.prisma.tag.create({
      data: { name },
    });
  }

  async findAll() {
    return this.prisma.tag.findMany({
      include: {
        topics: true,
      },
    });
  }

  async findOne(id: number) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: {
        topics: true,
      },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with id ${id} not found`);
    }

    return tag;
  }

  async update(id: number, updateTagDto: UpdateTagDto) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Tag with id ${id} not found`);
    }

    if (updateTagDto.name && updateTagDto.name !== tag.name) {
      const nameExists = await this.prisma.tag.findUnique({
        where: { name: updateTagDto.name },
      });
      if (nameExists) {
        throw new ConflictException('Tag with this name already exists');
      }
    }

    return this.prisma.tag.update({
      where: { id },
      data: updateTagDto,
      include: {
        topics: true,
      },
    });
  }

  async remove(id: number) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) {
      throw new NotFoundException(`Tag with id ${id} not found`);
    }

    return this.prisma.tag.delete({ where: { id } });
  }
}
