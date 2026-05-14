import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class AddContentEpisodeDto {
  @ApiProperty({ description: "Display title for this episode" })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  videoName: string;

  @ApiProperty({
    description: "Optional episode description",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  videoDescription?: string;
}
