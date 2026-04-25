import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

@Injectable()
export class TopicsService {
  constructor(private prisma: PrismaService) {}

  async create(createTopicDto: CreateTopicDto) {
    const { name, categoryId, complexity, language, tagIds } = createTopicDto;

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with id ${categoryId} not found`);
    }

    // Verify all tags exist if provided
    if (tagIds && tagIds.length > 0) {
      const tags = await this.prisma.tag.findMany({
        where: { id: { in: tagIds } },
      });
      if (tags.length !== tagIds.length) {
        throw new BadRequestException('One or more tag IDs do not exist');
      }
    }

    return this.prisma.topic.create({
      data: {
        name,
        categoryId,
        complexity,
        language,
        tags: tagIds && tagIds.length > 0 ? {
          connect: tagIds.map(id => ({ id })),
        } : undefined,
      },
      include: {
        category: true,
        tags: true,
      },
    });
  }

  async findAll() {
    return this.prisma.topic.findMany({
      include: {
        category: true,
        tags: true,
      },
    });
  }

  async findOne(id: number) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: {
        category: true,
        tags: true,
      },
    });

    if (!topic) {
      throw new NotFoundException(`Topic with id ${id} not found`);
    }

    return topic;
  }

  async update(id: number, updateTopicDto: UpdateTopicDto) {
    const topic = await this.prisma.topic.findUnique({ where: { id } });
    if (!topic) {
      throw new NotFoundException(`Topic with id ${id} not found`);
    }

    // Verify category exists if provided
    if (updateTopicDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: updateTopicDto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Category with id ${updateTopicDto.categoryId} not found`,
        );
      }
    }

    // Verify all tags exist if provided
    if (updateTopicDto.tagIds && updateTopicDto.tagIds.length > 0) {
      const tags = await this.prisma.tag.findMany({
        where: { id: { in: updateTopicDto.tagIds } },
      });
      if (tags.length !== updateTopicDto.tagIds.length) {
        throw new BadRequestException('One or more tag IDs do not exist');
      }
    }

    const { tagIds, ...topicData } = updateTopicDto;

    return this.prisma.topic.update({
      where: { id },
      data: {
        ...topicData,
        tags: tagIds ? {
          set: tagIds.map(tagId => ({ id: tagId })),
        } : undefined,
      },
      include: {
        category: true,
        tags: true,
      },
    });
  }

  async remove(id: number) {
    const topic = await this.prisma.topic.findUnique({ where: { id } });
    if (!topic) {
      throw new NotFoundException(`Topic with id ${id} not found`);
    }

    return this.prisma.topic.delete({ where: { id } });
  }
}

