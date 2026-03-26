import { PartialType } from "@nestjs/mapped-types";
import { CreateContentStatsDto } from "./create-content-stats.dto";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateContentStatsDto extends PartialType(CreateContentStatsDto) {}
