import { Module } from "@nestjs/common";
import { WeeklyReviewGeminiClient } from "./weekly-review-gemini.client";
import { WeeklyReviewService } from "./weekly-review.service";

@Module({
  providers: [WeeklyReviewService, WeeklyReviewGeminiClient],
  exports: [WeeklyReviewService],
})
export class WeeklyReviewModule {}
