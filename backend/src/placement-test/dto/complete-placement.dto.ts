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
    description:
      "Map of question ids (q1…) to chosen index 0–3 — compared to the draft saved when GET /document rendered the test.",
  })
  @IsOptional()
  @IsObject()
  answers?: Record<string, number>;
}
