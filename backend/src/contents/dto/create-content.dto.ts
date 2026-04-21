import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateContentDto {
  @ApiProperty({ description: 'The name of the content' })
  @IsString()
  @MinLength(2)
  @MaxLength(100, {message: "The maximum number of characters is 100"})
  name: string;

  @ApiProperty({ description: 'The friendly link for the content' })
  @IsString()
  friendlyLink: string;

  @ApiProperty({ description: 'The description of the content' })
  @IsString()
  @MaxLength(250)
  description: string;
}