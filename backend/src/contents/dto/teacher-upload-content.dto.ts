import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsString, MaxLength, MinLength } from "class-validator";

/** "public" = global catalog; "unlisted" = link-only. */
export class TeacherUploadContentDto {
  @ApiProperty({ description: "Lesson / series title shown in the catalog" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: "Catalog visibility",
    enum: ["public", "unlisted"],
  })
  @IsString()
  @IsIn(["public", "unlisted"])
  visibility: string;
}
