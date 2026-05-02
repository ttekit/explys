import {
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
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOperation, ApiProduces, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { renderComprehensionTestsIframeHtml } from "src/content-video/content-video-comprehension-tests-html";
import { ContentVideoComprehensionTestsService } from "src/content-video/content-video-comprehension-tests.service";
import { PostWatchSurveyService } from "src/content-video/post-watch-survey.service";
import { ContentVideoService } from "./content-video.service";
import { CreateContentVideoDto } from "./dto/create-content-video.dto";
import { ComprehensionSummaryRecommendationsBodyDto } from "./dto/summary-recommendations.dto";
import { UpdateContentVideoDto } from "./dto/update-content-video.dto";

@ApiTags("content-video")
@Controller("content-video")
export class ContentVideoController {
  constructor(
    private readonly config: ConfigService,
    private readonly contentVideoService: ContentVideoService,
    private readonly postWatchSurveyService: PostWatchSurveyService,
    private readonly comprehensionTestsService: ContentVideoComprehensionTestsService,
  ) { }

  @Post()
  create(@Body() createContentVideoDto: CreateContentVideoDto) {
    return this.contentVideoService.create(createContentVideoDto);
  }

  @Get()
  findAll() {
    return this.contentVideoService.findAll();
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

  @Post(":id/watch-complete")
  watchComplete(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: { userId?: number | null } | undefined,
  ) {
    return this.postWatchSurveyService.recordWatchAndGenerateSurvey(
      id,
      body?.userId ?? null,
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
      "Get comprehension/grammar tests (served from cache when present, otherwise generated and stored)",
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
    @Body() body: { token: string; answers: Record<string, number> },
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
