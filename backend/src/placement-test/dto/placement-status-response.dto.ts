import { ApiProperty } from "@nestjs/swagger";

export class PlacementStatusResponseDto {
  @ApiProperty({ example: false })
  hasCompletedPlacement: boolean;

  @ApiProperty({
    example: true,
    description: "Convenience flag: `!hasCompletedPlacement` (show the entry test).",
  })
  shouldShowEntryTest: boolean;
}
