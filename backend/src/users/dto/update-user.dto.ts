import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";
import { CreateUserDto } from "./create-user.dto";

export class UpdateUserDto extends PartialType(CreateUserDto) {
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