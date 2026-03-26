import {
  IsInt,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsArray,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateContentStatsDto {
  @ApiProperty({
    description: "The ID of the content media these statistics belong to",
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  contentMediaId: number;

  @ApiProperty({
    description: "The number of users who watched the content",
    example: 1200,
    required: false,
  })
  @IsInt()
  @IsOptional()
  usersWatched?: number;

  @ApiProperty({
    description: "The rating of the content",
    example: 4.5,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  rating?: number;

  @ApiProperty({
    description: "An array of Topic IDs related to the content",
    example: [1, 2, 3],
    required: false,
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  topicIds?: number[];
}
