import { IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateContentMediaDto {
  @ApiProperty({
    description: "The ID of the category this media belongs to",
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  categoryId: number;

  @ApiProperty({
    description: "The type of media (e.g., 'image', 'audio', 'document')",
    example: "image",
    required: false,
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({
    description: "The URL link to the media content itself",
    example: "http://example.com/image.jpg",
    required: false,
  })
  @IsString()
  @IsOptional()
  url?: string; // Link to the media content itself

  @ApiProperty({
    description: "Alternative text for the media content",
    example: "A beautiful landscape",
    required: false,
  })
  @IsString()
  @IsOptional()
  altText?: string;

  @ApiProperty({
    description: "A caption for the media content",
    example: "Sunset over the mountains",
    required: false,
  })
  @IsString()
  @IsOptional()
  caption?: string;
}
