import { ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";
import { CreateUserDto } from "./create-user.dto";

/** User updates cannot set studying-plan phases or active phase (derived from quiz progress). */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, [
    "studyingPlanPhases",
    "activeStudyingPhaseIndex",
  ] as const),
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isSuspended?: boolean;

  /** Stored on `UserSettings.playbackSpeed` */
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  playbackSpeed?: number;

  /** Stored on `UserSettings.currentResolution` (e.g. auto, 720p) */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentResolution?: string;
}