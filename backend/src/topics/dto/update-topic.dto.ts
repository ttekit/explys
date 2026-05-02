import { PartialType } from '@nestjs/mapped-types';
import { CreateTopicDto } from './create-topic.dto';
import { IsArray, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTopicDto extends PartialType(CreateTopicDto) {
  @ApiPropertyOptional({
    description: 'Array of tag IDs to associate with this topic',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsOptional()
  tagIds?: number[];
}

