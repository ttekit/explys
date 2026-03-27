import { Module } from '@nestjs/common';
import { AlcorythmService } from './alcorythm.service';
import { PrismaService } from 'src/prisma.service';
import { AlcorythmGeminiTagScoreClient } from './alcorythm-gemini-tag-score.client';

@Module({
  providers: [AlcorythmService, PrismaService, AlcorythmGeminiTagScoreClient],
  exports: [AlcorythmService],
})
export class AlcorythmModule {}
