import { PartialType } from "@nestjs/mapped-types";
import { CreateContentMediaDto } from "./create-content-media.dto";

export class UpdateContentMediaDto extends PartialType(CreateContentMediaDto) {}
