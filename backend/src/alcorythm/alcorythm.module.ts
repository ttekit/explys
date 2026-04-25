import { Module } from "@nestjs/common";
import { AlcorythmGeminiTagScoreClient } from "./alcorythm-gemini-tag-score.client";
import { AlcorythmService } from "./alcorythm.service";

@Module({
  providers: [AlcorythmService, AlcorythmGeminiTagScoreClient],
  exports: [AlcorythmService],
})
export class AlcorythmModule {}
