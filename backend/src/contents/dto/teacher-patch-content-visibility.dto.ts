import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString } from "class-validator";

export class TeacherPatchContentVisibilityDto {
  @ApiProperty({ enum: ["public", "unlisted"] })
  @IsString()
  @IsIn(["public", "unlisted"])
  visibility: string;
}
