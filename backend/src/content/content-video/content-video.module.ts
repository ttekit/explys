import { Module } from "@nestjs/common";
import { ContentVideoComprehensionTestsGeminiClient } from "src/content-video/content-video-comprehension-tests-gemini.client";
import { ContentVideoComprehensionTestsService } from "src/content-video/content-video-comprehension-tests.service";
import { PostWatchSurveyGeminiClient } from "src/content-video/post-watch-survey-gemini.client";
import { PostWatchSurveyService } from "src/content-video/post-watch-survey.service";
import { ContentVideoController } from "./content-video.controller";
import { ContentVideoService } from "./content-video.service";

@Module({
  controllers: [ContentVideoController],
  providers: [
    ContentVideoService,
    PostWatchSurveyService,
    PostWatchSurveyGeminiClient,
    ContentVideoComprehensionTestsService,
    ContentVideoComprehensionTestsGeminiClient,
  ],
})
export class ContentVideoModule {}
