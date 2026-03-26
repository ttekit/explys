import { ApiProperty } from '@nestjs/swagger';

export class CreateContentDto {
  @ApiProperty({ description: 'The name of the content' })
  name: string;

  @ApiProperty({ description: 'The friendly link for the content' })
  friendlyLink: string;

  @ApiProperty({ description: 'The description of the content' })
  description: string;
}