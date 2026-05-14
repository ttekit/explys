import { ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";
import { CreateUserDto } from "./create-user.dto";
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";

/** User updates cannot set studying-plan phases or active phase (derived from quiz progress). */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, [
    "studyingPlanPhases",
    "activeStudyingPhaseIndex",
  ] as const),
) {
  @IsOptional()
  @IsString({ message: "Name must be a string." })
  @IsNotEmpty({ message: "Name is required." })
  name?: string;

  @IsOptional()
  @IsString({ message: "Email must be a string." })
  @IsEmail({}, { message: "Incorrect email format." })
  @IsNotEmpty({ message: "Email is required." })
  email?: string;

  @IsOptional()
  @IsBoolean({ message: "isTwoFactorEnabled must be a boolean value." })
  @Transform(({ value }) => {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return false;
  })
  isTwoFactorEnabled?: boolean;
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
