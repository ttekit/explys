import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

/**
 * Body for regenerate-studying-plan: UI language for learner-facing plan text.
 */
export class RegenerateStudyingPlanDto {
  @ApiPropertyOptional({
    description: 'Language for regenerated plan copy (titles, summaries, habits). Default en.',
    enum: ['en', 'uk'],
    example: 'uk',
  })
  @IsOptional()
  @IsString()
  @IsIn(['en', 'uk'], { message: 'locale must be "en" or "uk"' })
  locale?: string;
}
