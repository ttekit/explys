import { Module } from '@nestjs/common';
import { ContentRecommendationsController } from './content-recommendations.controller';
import { ContentRecommendationsService } from './content-recommendations.service';

@Module({
  controllers: [ContentRecommendationsController],
  providers: [ContentRecommendationsService],
  exports: [ContentRecommendationsService],
})
export class ContentRecommendationsModule {}
