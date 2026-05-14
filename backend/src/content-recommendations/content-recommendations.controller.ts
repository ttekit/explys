import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthGuard } from 'src/auth/auth.guard';
import { jwtSubToUserId } from 'src/auth/jwt-subject.util';
import { ContentRecommendationsService } from './content-recommendations.service';

@ApiTags('content-recommendations')
@Controller('content-recommendations')
export class ContentRecommendationsController {
  constructor(
    private readonly contentRecommendationsService: ContentRecommendationsService,
  ) {}

  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @ApiOperation({
    summary:
      'Rank videos for the signed-in learner (same scoring as legacy for-user/:id)',
  })
  recommendationsForSignedInLearner(@Req() req: Request & { user: unknown }) {
    const userId = jwtSubToUserId(req.user);
    return this.contentRecommendationsService.getRecommendationsForUser(userId);
  }

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
