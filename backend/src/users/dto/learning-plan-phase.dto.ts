import {
  ArrayMaxSize,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class LearningPlanPhasePayloadDto {
  @IsString()
  @MaxLength(220)
  title: string;

  @IsString()
  @MaxLength(2000)
  summary: string;

  @IsArray()
  @ArrayMaxSize(40)
  @IsString({ each: true })
  @MaxLength(2000, { each: true })
  actions: string[];

  /** v2 structured tasks; required in persisted v2 plans — optional on this DTO for partial payloads. */
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  tasks?: Record<string, unknown>[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @IsString({ each: true })
  @MaxLength(800, { each: true })
  passConditions?: string[];
}
