import { Module } from "@nestjs/common";
import { AlcorythmGeminiTagScoreClient } from "./alcorythm-gemini-tag-score.client";
import { AlcorythmGeminiTranscriptTagClient } from "./alcorythm-gemini-transcript-tags.client";
import { AlcorythmService } from "./alcorythm.service";

@Module({
  providers: [
    AlcorythmService,
    AlcorythmGeminiTagScoreClient,
    AlcorythmGeminiTranscriptTagClient,
  ],
  exports: [AlcorythmService, AlcorythmGeminiTranscriptTagClient],
})
export class AlcorythmModule {}
