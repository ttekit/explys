import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PlacementSummaryDto {
  @ApiProperty({
    type: [String],
    example: ["arrangements", "consistently trustworthy"],
  })
  vocabularyReinforced: string[];

  @ApiProperty({ type: [String], example: ["put off later"] })
  vocabularyToReview: string[];

  @ApiProperty({
    type: [String],
    example: ["articles (a / an / the)", "relative clauses"],
  })
  grammarYouPracticed: string[];

  @ApiProperty({ type: [String], example: ["perfect tenses"] })
  grammarToRevisit: string[];
}

export class PlacementCompleteResponseDto {
  @ApiProperty({ example: true })
  ok: true;

  /** CEFR code written to `englishLevel`, e.g. `B2` (Algorythm expects A1–C2 codes). */
  @ApiPropertyOptional({
    example: "B2",
    description:
      "Main-line CEFR band code returned on `/auth/profile` as `englishLevel`.",
  })
  englishLevel?: string;

  /** Human-readable proficiency title (iframe parity). */
  @ApiPropertyOptional({ example: "Upper intermediate" })
  cefrLabel?: string;

  @ApiPropertyOptional({ example: 8 })
  score?: number;

  @ApiPropertyOptional({ example: 12 })
  totalQuestions?: number;

  @ApiPropertyOptional({
    example: 67,
    description: "Rounded percentage correct.",
  })
  percentage?: number;

  @ApiPropertyOptional({
    type: PlacementSummaryDto,
    description:
      "Friendly recap of vocabulary and grammar addressed in this attempt.",
  })
  summary?: PlacementSummaryDto;
}
