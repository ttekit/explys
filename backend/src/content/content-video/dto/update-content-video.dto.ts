import { PartialType } from "@nestjs/mapped-types";
import { CreateContentVideoDto } from "./create-content-video.dto";

export class UpdateContentVideoDto extends PartialType(CreateContentVideoDto) {}
