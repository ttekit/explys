import { ApiProperty } from "@nestjs/swagger";

export class PlacementCompleteResponseDto {
  @ApiProperty({ example: true })
  ok: true;
}
