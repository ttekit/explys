import { IsString, IsNotEmpty, IsNumber, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTopicDto {
  @ApiProperty({
    description: 'The name of the topic',
    example: 'Present Perfect Tense',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'The ID of the category this topic belongs to',
    example: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  categoryId: number;

  @ApiProperty({
    description: 'The complexity level of the topic (1-5)',
    example: 3,
  })
  @IsNumber()
  @IsNotEmpty()
  complexity: number;

  @ApiProperty({
    description: 'The language code for the topic content',
    example: 'en',
  })
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiPropertyOptional({
    description: 'Array of tag IDs to associate with this topic',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsArray()
  @IsOptional()
  tagIds?: number[];
}

