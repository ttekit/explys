import { PartialType } from "@nestjs/mapped-types";
import { CreateContentMediaDto } from "./create-content-media.dto";
import { ApiProperty } from "@nestjs/swagger";

export class UpdateContentMediaDto extends PartialType(CreateContentMediaDto) {}
