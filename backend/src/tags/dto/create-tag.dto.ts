import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({
    description: 'The name of the tag',
    example: 'Grammar',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}

