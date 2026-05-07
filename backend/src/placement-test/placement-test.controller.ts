import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from "@nestjs/swagger";
import { appendFileSync } from "node:fs";
import { Request, Response } from "express";
import { CompletePlacementDto } from "./dto/complete-placement.dto";
import { PlacementCompleteResponseDto } from "./dto/placement-complete-response.dto";
import { PlacementStatusResponseDto } from "./dto/placement-status-response.dto";
import { PlacementJwtGuard } from "./placement-jwt.guard";
import { PlacementTestService } from "./placement-test.service";

type AuthedRequest = Request & { user: { sub: number; email: string } };

function inferApiPublicOrigin(req: Request): string {
  const xf = req.headers["x-forwarded-proto"];
  const raw =
    typeof xf === "string" ? xf.split(",")[0]?.trim() : undefined;
  const proto = (raw || req.protocol || "http").replace(/:$/, "");
  const host = req.get("host");
  if (!host) return "";
  return `${proto}://${host}`;
}

function getBearerOrQueryToken(req: Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }
  const q = req.query as Record<string, string | undefined>;
  if (typeof q?.access_token === "string" && q.access_token.length > 0) {
    return q.access_token;
  }
  return "";
}

@Controller("placement-test")
@ApiTags("placement-test")
export class PlacementTestController {
  constructor(
    private readonly placementTest: PlacementTestService,
    private readonly config: ConfigService,
  ) {}

  @Get("status")
  @UseGuards(PlacementJwtGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiHeader({
    name: "x-api-token",
    required: false,
    description: "Global API key in production (see `API_TOKEN`).",
  })
  @ApiSecurity("api-token")
  @ApiOperation({
    summary: "Placement status for dashboard (show entry test or not)",
  })
  @ApiOkResponse({ type: PlacementStatusResponseDto })
  @ApiResponse({ status: 401, description: "Invalid or missing JWT" })
  status(@Req() req: AuthedRequest) {
    return this.placementTest.getStatus(req.user.sub);
  }

  @Get("document")
  @UseGuards(PlacementJwtGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiSecurity("api-token")
  @ApiHeader({
    name: "x-api-token",
    required: false,
    description: "Global API key in production (see `API_TOKEN`).",
  })
  @ApiQuery({
    name: "access_token",
    required: false,
    description:
      "Optional JWT in the query string for iframe `src` (when `Authorization` is not available). " +
      "Functionally the same as `Authorization: Bearer`.",
    example: "<jwt>",
  })
  @ApiOperation({
    summary: "Entry placement test as a standalone HTML page (iframe `src`)",
    description:
      "Use `?access_token=<JWT>` when the browser cannot send Authorization for an iframe (same origin as the API). " +
      "Responds with `text/html` and `Content-Security-Policy: frame-ancestors` (set `PLACEMENT_TEST_FRAME_ANCESTORS` in production). " +
      "Each load persists a scoring draft keyed to the questionnaire in this response; `POST /placement-test/complete` scores against that draft.",
  })
  @ApiProduces("text/html")
  @Header("Content-Type", "text/html; charset=utf-8")
  @Header("Cache-Control", "no-store")
  @ApiOkResponse({
    description:
      'Full HTML document (styled test UI, ready for `<iframe src="…">`)',
  })
  @ApiResponse({ status: 401, description: "Invalid or missing JWT" })
  async document(@Req() req: AuthedRequest, @Res() res: Response) {
    const frame = this.config.get<string>("PLACEMENT_TEST_FRAME_ANCESTORS");
    if (frame?.trim()) {
      res.setHeader(
        "Content-Security-Policy",
        `frame-ancestors ${frame.trim()}`,
      );
    } else {
      res.setHeader("Content-Security-Policy", "frame-ancestors *");
    }
    const payload = await this.placementTest.buildTestPayloadForUser(
      req.user.sub,
    );
    const token = getBearerOrQueryToken(req);
    const html = this.placementTest.renderDocumentHtml(
      payload,
      token,
      inferApiPublicOrigin(req),
    );
    // #region agent log
    try {
      appendFileSync(
        "/Users/ttekit/code/eng_curses/.cursor/debug-0c8a48.log",
        JSON.stringify({
          sessionId: "0c8a48",
          hypothesisId: "SRV",
          location: "placement-test.controller.ts:document",
          message: "placement html",
          data: {
            userId: req.user.sub,
            q: payload.questions?.length ?? -1,
            htmlLen: html.length,
          },
          timestamp: Date.now(),
        }) + "\n",
      );
    } catch {
      /* debug */
    }
    // #endregion
    res.send(html);
  }

  @Post("complete")
  @UseGuards(PlacementJwtGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiHeader({
    name: "x-api-token",
    required: false,
    description: "Global API key in production (see `API_TOKEN`).",
  })
  @ApiSecurity("api-token")
  @ApiOperation({
    summary:
      "Complete placement: score answers vs server draft and persist CEFR (`englishLevel`).",
  })
  @ApiBody({
    type: CompletePlacementDto,
    required: false,
    description:
      "`access_token` when iframe callers cannot send `Authorization`; `answers` maps ids (q1…) to chosen index 0–3.",
  })
  @ApiCreatedResponse({ type: PlacementCompleteResponseDto })
  @ApiResponse({ status: 401, description: "Invalid or missing JWT" })
  complete(
    @Req() req: AuthedRequest,
    @Body() body: CompletePlacementDto,
  ) {
    return this.placementTest.completePlacement(req.user.sub, body ?? {});
  }
}
