import { PartialType } from "@nestjs/mapped-types";
import { CreateContentStatsDto } from "./create-content-stats.dto";

export class UpdateContentStatsDto extends PartialType(CreateContentStatsDto) {}
