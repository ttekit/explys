import { PartialType } from "@nestjs/mapped-types";
import { CreateContentVideoDto } from "./create-content-video.dto";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateContentVideoDto extends PartialType(CreateContentVideoDto) {}
