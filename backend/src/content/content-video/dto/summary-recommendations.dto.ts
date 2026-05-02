import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

class SubScoreDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  correct: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  total: number;
}

export class ComprehensionSummaryRecommendationsBodyDto {
  @ApiProperty()
  @IsString()
  videoName: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsString()
  learnerCefr: string | null;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  vocabularyTerms: string[];

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  correct: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  percentage: number;

  @ApiProperty()
  @ValidateNested()
  @Type(() => SubScoreDto)
  comprehension: SubScoreDto;

  @ApiProperty()
  @ValidateNested()
  @Type(() => SubScoreDto)
  grammar: SubScoreDto;
}
