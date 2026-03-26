import { IsInt, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateContentMediaDto {
  @ApiProperty({
    description: "The ID of the category this media belongs to",
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  categoryId: number;
}
