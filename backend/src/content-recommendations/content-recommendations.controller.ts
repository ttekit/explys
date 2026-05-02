import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { ContentRecommendationsService } from './content-recommendations.service';

@ApiTags('content-recommendations')
@Controller('content-recommendations')
export class ContentRecommendationsController {
  constructor(
    private readonly contentRecommendationsService: ContentRecommendationsService,
  ) {}

  @Get('for-user/:userId')
  @ApiOperation({
    summary: 'Rank videos for a user',
    description:
      'Uses user CEFR (englishLevel), per-topic knowledge as vocabulary strength, ' +
      'hobbies/interests/selected topics vs video theme tags, video CEFR and processing complexity, ' +
      'and topic overlap when the video is linked to topics on ContentStats.',
  })
  @ApiParam({ name: 'userId', type: 'integer' })
  forUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.contentRecommendationsService.getRecommendationsForUser(userId);
  }
}
