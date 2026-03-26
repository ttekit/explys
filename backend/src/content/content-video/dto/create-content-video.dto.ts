import { IsInt, IsString, IsOptional, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateContentVideoDto {
  @ApiProperty({
    description: "The ID of the content media this video belongs to",
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  contentId: number;

  @ApiProperty({
    description: "The URL link to the video content",
    example: "http://example.com/video1.mp4",
  })
  @IsString()
  @IsNotEmpty()
  videoLink: string;

  @ApiProperty({
    description: "The name of the video",
    example: "Introduction to NestJS",
  })
  @IsString()
  @IsNotEmpty()
  videoName: string;

  @ApiProperty({
    description: "A description of the video (optional)",
    example: "This video covers the basics of NestJS",
    required: false,
  })
  @IsString()
  @IsOptional()
  videoDescription?: string;
}
