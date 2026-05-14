import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsInt } from "class-validator";

export class ReorderContentPlaylistDto {
  @ApiProperty({
    description:
      "ContentMedia ids in desired order (index 0 = first episode in the series).",
    example: [12, 15, 18],
    type: [Number],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  orderedContentMediaIds: number[];
}
