import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString } from "class-validator";

export class CompletePlacementDto {
  @ApiProperty({
    required: false,
    description:
      "Optional JWT when the request cannot use Authorization (e.g. from iframe).",
  })
  @IsOptional()
  @IsString()
  access_token?: string;

  @ApiProperty({
    required: false,
    description: "Map of question id to selected option index 0..3 (optional, for future scoring).",
  })
  @IsOptional()
  @IsObject()
  answers?: Record<string, number>;
}
