import { Module } from "@nestjs/common";
import { AlcorythmModule } from "src/alcorythm/alcorythm.module";
import { AuthModule } from "src/auth/auth.module";
import { VideoTranscriptTagsService } from "src/contents/video-transcript-tags.service";
import { VideoCaptionsService } from "src/contents/video-captions.service";
import { ContentVideoComprehensionTestsGeminiClient } from "src/content-video/content-video-comprehension-tests-gemini.client";
import { ContentVideoComprehensionTestsService } from "src/content-video/content-video-comprehension-tests.service";
import { ContentVideoOpenAnswerGraderClient } from "src/content-video/content-video-open-answer-grader.client";
import { ContentVideoSummaryRecommendationsGeminiClient } from "src/content-video/content-video-summary-recommendations-gemini.client";
import { PostWatchSurveyGeminiClient } from "src/content-video/post-watch-survey-gemini.client";
import { PostWatchSurveyService } from "src/content-video/post-watch-survey.service";
import { VocabularyHintsService } from "src/content-video/vocabulary-hints.service";
import { VocabularyPersonalizationService } from "src/content-video/vocabulary-personalization.service";
import { VocabularyPersonalizeGeminiClient } from "src/content-video/vocabulary-personalize-gemini.client";
import { UserVocabularyModule } from "src/user-vocabulary/user-vocabulary.module";
import { ContentVideoController } from "./content-video.controller";
import { ContentVideoService } from "./content-video.service";

@Module({
  imports: [AuthModule, AlcorythmModule, UserVocabularyModule],
  controllers: [ContentVideoController],
  providers: [
    ContentVideoService,
    VideoTranscriptTagsService,
    VideoCaptionsService,
    PostWatchSurveyService,
    PostWatchSurveyGeminiClient,
    ContentVideoComprehensionTestsService,
    ContentVideoComprehensionTestsGeminiClient,
    ContentVideoOpenAnswerGraderClient,
    ContentVideoSummaryRecommendationsGeminiClient,
    VocabularyHintsService,
    VocabularyPersonalizeGeminiClient,
    VocabularyPersonalizationService,
  ],
  exports: [ContentVideoService, VideoCaptionsService],
})
export class ContentVideoModule { }
