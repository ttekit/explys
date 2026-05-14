import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOperation, ApiProduces, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { AuthGuard } from "src/auth/auth.guard";
import { ApiTokenOnlyGuard } from "src/auth/guards/api-token-only.guard";
import { jwtSubToUserId } from "src/auth/jwt-subject.util";
import { renderComprehensionTestsIframeHtml } from "src/content-video/content-video-comprehension-tests-html";
import { ContentVideoComprehensionTestsService } from "src/content-video/content-video-comprehension-tests.service";
import { PostWatchSurveyService } from "src/content-video/post-watch-survey.service";
import { VideoTranscriptTagsService } from "src/contents/video-transcript-tags.service";
import { VideoCaptionsService } from "src/contents/video-captions.service";
import { ContentVideoService } from "./content-video.service";
import { CreateContentVideoDto } from "./dto/create-content-video.dto";
import { ComprehensionSummaryRecommendationsBodyDto } from "./dto/summary-recommendations.dto";
import { UpdateContentVideoDto } from "./dto/update-content-video.dto";
import { VocabularyHintsService } from "src/content-video/vocabulary-hints.service";
import { VocabularyPersonalizationService } from "src/content-video/vocabulary-personalization.service";

@ApiTags("content-video")
@Controller("content-video")
export class ContentVideoController {
  constructor(
    private readonly config: ConfigService,
    private readonly contentVideoService: ContentVideoService,
    private readonly videoTranscriptTags: VideoTranscriptTagsService,
    private readonly videoCaptionsService: VideoCaptionsService,
    private readonly postWatchSurveyService: PostWatchSurveyService,
    private readonly comprehensionTestsService: ContentVideoComprehensionTestsService,
    private readonly vocabularyHintsService: VocabularyHintsService,
    private readonly vocabularyPersonalizationService: VocabularyPersonalizationService,
  ) { }

  @Post()
  create(@Body() createContentVideoDto: CreateContentVideoDto) {
    return this.contentVideoService.create(createContentVideoDto);
  }

  @Get()
  findAll() {
    return this.contentVideoService.findAll();
  }

  @Get("watched")
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: "Watched lessons for the signed-in learner",
    description:
      "Returns distinct catalog videos where the user has at least one `WatchSession`, newest first.",
  })
  findWatchedForLearner(@Req() req: Request & { user: unknown }) {
    const userId = jwtSubToUserId(req.user);
    return this.contentVideoService.findWatchedByUser(userId);
  }

  @Get("recent-watched")
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: "Recent clips for the signed-in learner (by last activity)",
    description:
      "Returns up to `limit` distinct videos, newest `WatchSession` first, with series title and best quiz score when any.",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Max clips (1–24, default 8)",
  })
  findRecentWatchedForLearner(
    @Req() req: Request & { user: unknown },
    @Query("limit") limitRaw?: string,
  ) {
    const userId = jwtSubToUserId(req.user);
    const parsed =
      limitRaw != null && limitRaw !== ""
        ? Number.parseInt(limitRaw, 10)
        : Number.NaN;
    const limit = Number.isFinite(parsed) ? parsed : 8;
    return this.contentVideoService.findRecentWatchedForUser(userId, limit);
  }

  @Post("vocabulary-hints")
  @ApiOperation({
    summary:
      "Hints for vocabulary cards: translation (optional target language), English pronunciation, simple English meaning",
  })
  async vocabularyHints(
    @Body() body: { words?: string[]; targetLang?: string | null } | undefined,
  ) {
    const words = Array.isArray(body?.words) ? body!.words! : [];
    const hints = await this.vocabularyHintsService.getHints(
      words,
      body?.targetLang ?? null,
    );
    return { hints };
  }

  @Post(":id/vocabulary-personalize")
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary:
      "Personalized vocabulary hints (native translation + CEFR-tuned English gloss) for signed-in learners",
    description:
      "Call once when the learner starts watching. Requires the same key-vocab words as the lesson bundle.",
  })
  async vocabularyPersonalize(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { words?: string[] } | undefined,
    @Req() req: Request & { user: unknown },
  ) {
    const userId = jwtSubToUserId(req.user);
    const words = Array.isArray(body?.words) ? body!.words! : [];
    const hints = await this.vocabularyPersonalizationService.personalizeForUser({
      userId,
      contentVideoId: id,
      words,
    });
    return { hints };
  }

  @Post("surveys/:surveyId/submit")
  submitPostWatchSurvey(
    @Param("surveyId", ParseIntPipe) surveyId: number,
    @Body() body: { answers?: Record<string, unknown> },
  ) {
    return this.postWatchSurveyService.submitSurvey(
      surveyId,
      body?.answers ?? {},
    );
  }

  @Get(":id/iframe")
  getIframe(@Param("id", ParseIntPipe) id: number) {
    return this.contentVideoService.getIframePayload(id);
  }

  @Post(":id/regenerate-tags")
  @UseGuards(ApiTokenOnlyGuard)
  @ApiOperation({
    summary: "Regenerate theme labels (userTags) from captions",
    description:
      "Re-analyzes the WebVTT transcript (Gemini) and updates ContentStats.userTags only. Requires captions.",
  })
  regenerateThemeTags(@Param("id", ParseIntPipe) id: number) {
    return this.videoTranscriptTags.regenerateTagsForContentVideo(id, "userTags");
  }

  @Post(":id/regenerate-genres")
  @UseGuards(ApiTokenOnlyGuard)
  @ApiOperation({
    summary: "Regenerate CEFR / level bands (systemTags) from captions",
    description:
      "Re-analyzes the transcript and updates ContentStats.systemTags and processingComplexity. UI label “genres” maps to level bands, not learner Genre prefs.",
  })
  regenerateLevelTags(@Param("id", ParseIntPipe) id: number) {
    return this.videoTranscriptTags.regenerateTagsForContentVideo(id, "systemTags");
  }

  @Post(":id/regenerate-captions")
  @UseGuards(ApiTokenOnlyGuard)
  @ApiOperation({
    summary: "Regenerate WebVTT captions",
    description:
      "Downloads MP4 from `videoLink`, FFmpeg extracts mono 16 kHz PCM WAV, POSTs `audio/wav` to Listen (`DEEPGRAM_TRANSCRIBE_MODEL`, default `nova-3`), writes WebVTT to S3, upserts `VideoCaptions`. Optional Gemini tag refresh after success.",
  })
  async regenerateCaptions(@Param("id", ParseIntPipe) id: number) {
    const row = await this.videoCaptionsService.generateCaptions(id);
    if (row === null) {
      throw new BadRequestException(
        "Caption generation could not run. Set DEEPGRAM_API_KEY and ensure FFmpeg can decode the video’s audio (see server logs). Optional: FFMPEG_PATH, DEEPGRAM_TRANSCRIBE_MODEL.",
      );
    }
    return {
      ok: true,
      contentVideoId: id,
      subtitlesFileLink: row.subtitlesFileLink,
    };
  }

  @Get(":id/captions")
  @ApiOperation({
    summary: "WebVTT captions (catalog learner UI)",
    description:
      "Returns the same `.vtt` stored for the lesson as `/subtitles`, without admin-only auth. Proxied from S3 via the API.",
  })
  @ApiProduces("text/vtt")
  @Header("Cache-Control", "public, max-age=120")
  async learnerCaptionsVtt(
    @Param("id", ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    await this.contentVideoService.findOne(id);
    const body = await this.videoCaptionsService.fetchStoredSubtitlesVtt(id);
    res.status(200).type("text/vtt; charset=utf-8").send(body);
  }

  @Get(":id/subtitles")
  @UseGuards(ApiTokenOnlyGuard)
  @ApiOperation({
    summary: "Plain WebVTT (admin API token)",
    description:
      "Returns `text/vtt` for captions on S3. Requires `x-api-token` (same as other admin tooling). Use this from the admin SPA to avoid cross-origin fetches to the bucket.",
  })
  @ApiProduces("text/vtt")
  @Header("Cache-Control", "no-store")
  async adminSubtitlesText(
    @Param("id", ParseIntPipe) id: number,
    @Res() res: Response,
  ): Promise<void> {
    await this.contentVideoService.findOne(id);
    const body = await this.videoCaptionsService.fetchStoredSubtitlesVtt(id);
    res.status(200).type("text/vtt; charset=utf-8").send(body);
  }

  @Post(":id/watch-complete")
  @UseGuards(AuthGuard)
  watchComplete(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: Request & { user: unknown },
    @Body() body: { secondsWatched?: number } // <--- Добавляем получение body
  ) {
    const userId = jwtSubToUserId(req.user);

    // Передаем секунды третьим аргументом в сервис
    return this.postWatchSurveyService.recordWatchAndGenerateSurvey(
      id,
      userId,
      body.secondsWatched
    );
  }

  @Post(":id/tests/generate")
  generateComprehensionTests(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { userId?: number | null } | undefined,
  ) {
    return this.comprehensionTestsService.generate(
      id,
      body?.userId ?? null,
    );
  }

  @Get(":id/tests")
  @ApiOperation({
    summary:
      "Get comprehension/grammar tests (fresh generation each request; optional userId for personalization)",
  })
  @ApiQuery({
    name: "userId",
    required: false,
    description: "Optional user for CEFR and saved vocabulary in metadata (same as POST /tests/generate).",
  })
  getComprehensionTests(
    @Param("id", ParseIntPipe) id: number,
    @Query("userId") userIdRaw: string | undefined,
  ) {
    const parsed =
      userIdRaw != null && userIdRaw !== ""
        ? Number.parseInt(userIdRaw, 10)
        : Number.NaN;
    const userId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    return this.comprehensionTestsService.getOrLoadTests(id, userId);
  }

  @Get(":id/tests/iframe")
  @ApiOperation({
    summary: "Comprehension + grammar test as a standalone HTML page (iframe src)",
    description:
      "Generates the same test as POST …/tests/generate and returns `text/html` for embedding, " +
      "e.g. `<iframe src=\"{API}/content-video/1/tests/iframe?userId=2\">` (userId is optional, for CEFR/vocab and saving topic scores). " +
      "Submit results with POST /content-video/:id/tests/submit. " +
      "CSP: `COMPREHENSION_TEST_FRAME_ANCESTORS` or `*` default.",
  })
  @ApiQuery({
    name: "userId",
    required: false,
    description: "Optional user id to tailor CEFR and saved vocabulary (same as POST body).",
  })
  @ApiQuery({
    name: "summaryBase",
    required: false,
    description:
      "After a successful submit, redirect the top window to this URL (e.g. https://app.example.com/test/comprehension-summary) with score query params.",
  })
  @ApiProduces("text/html")
  @Header("Content-Type", "text/html; charset=utf-8")
  @Header("Cache-Control", "no-store")
  async comprehensionTestsIframe(
    @Param("id", ParseIntPipe) id: number,
    @Query("userId") userIdRaw: string | undefined,
    @Query("summaryBase") summaryBase: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const frame = this.config.get<string>("COMPREHENSION_TEST_FRAME_ANCESTORS");
    if (frame?.trim()) {
      res.setHeader("Content-Security-Policy", `frame-ancestors ${frame.trim()}`);
    } else {
      res.setHeader("Content-Security-Policy", "frame-ancestors *");
    }
    const parsed =
      userIdRaw != null && userIdRaw !== ""
        ? Number.parseInt(userIdRaw, 10)
        : Number.NaN;
    const userId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    const result = await this.comprehensionTestsService.getOrLoadTests(id, userId);
    const apiOrigin = `${req.protocol}://${req.get("host") ?? "localhost"}`;
    res.send(
      renderComprehensionTestsIframeHtml(result, apiOrigin, {
        summaryBase: summaryBase?.trim() || null,
      }),
    );
  }

  @Post(":id/tests/submit")
  @ApiOperation({
    summary: "Submit comprehension/grammar test; updates UserLanguageData for linked topics",
  })
  submitComprehensionTest(
    @Param("id", ParseIntPipe) id: number,
    @Body()
    body: {
      token: string;
      answers: Record<string, number | string>;
      /** Words from lesson key vocabulary; saved for authenticated learners. */
      keyVocabularyTerms?: string[];
      /** Optional glosses (native + English) aligned with keyVocabularyTerms. */
      keyVocabularyDetails?: Array<{
        term: string;
        nativeTranslation?: string | null;
        learnerDescription?: string | null;
      }>;
    },
  ) {
    return this.comprehensionTestsService.submit(id, body);
  }

  @Post(":id/summary-recommendations")
  @ApiOperation({
    summary:
      "Gemini: personalized summary, focus words, and next steps after a test (uses scores + vocabulary list)",
  })
  comprehensionSummaryRecommendations(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ComprehensionSummaryRecommendationsBodyDto,
  ) {
    return this.comprehensionTestsService.getSummaryRecommendations(id, body);
  }

  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.contentVideoService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateContentVideoDto: UpdateContentVideoDto,
  ) {
    return this.contentVideoService.update(id, updateContentVideoDto);
  }

  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.contentVideoService.remove(id);
  }
}
