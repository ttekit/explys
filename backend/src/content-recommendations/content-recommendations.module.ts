import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { ContentRecommendationsController } from './content-recommendations.controller';
import { ContentRecommendationsService } from './content-recommendations.service';

@Module({
  imports: [AuthModule],
  controllers: [ContentRecommendationsController],
  providers: [ContentRecommendationsService],
  exports: [ContentRecommendationsService],
})
export class ContentRecommendationsModule {}
