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
import { Request, Response } from "express";
import { CompletePlacementDto } from "./dto/complete-placement.dto";
import { PlacementCompleteResponseDto } from "./dto/placement-complete-response.dto";
import { PlacementStatusResponseDto } from "./dto/placement-status-response.dto";
import { PlacementJwtGuard } from "./placement-jwt.guard";
import { PlacementTestService } from "./placement-test.service";

type AuthedRequest = Request & { user: { sub: number; email: string } };

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
      "The returned HTML issues `POST /placement-test/complete` on submit; embeds `x-api-token` in that request in production when `API_TOKEN` is set.",
  })
  @ApiProduces("text/html")
  @Header("Content-Type", "text/html; charset=utf-8")
  @Header("Cache-Control", "no-store")
  @ApiOkResponse({
    description: "Full HTML document (styled test UI, ready for `<iframe src=\"…\">`)",
  })
  @ApiResponse({ status: 401, description: "Invalid or missing JWT" })
  async document(@Req() req: AuthedRequest, @Res() res: Response) {
    const frame = this.config.get<string>("PLACEMENT_TEST_FRAME_ANCESTORS");
    if (frame?.trim()) {
      res.setHeader("Content-Security-Policy", `frame-ancestors ${frame.trim()}`);
    } else {
      res.setHeader("Content-Security-Policy", "frame-ancestors *");
    }
    const payload = await this.placementTest.buildTestPayloadForUser(
      req.user.sub,
    );
    const token = getBearerOrQueryToken(req);
    const html = this.placementTest.renderDocumentHtml(payload, token);
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
    summary: "Mark placement as completed (one time)",
  })
  @ApiBody({
    type: CompletePlacementDto,
    required: false,
    description:
      "Optional body: `access_token` if JWT was not sent via `Authorization` (iframe); `answers` is optional for future scoring.",
  })
  @ApiCreatedResponse({ type: PlacementCompleteResponseDto })
  @ApiResponse({ status: 401, description: "Invalid or missing JWT" })
  complete(
    @Req() req: AuthedRequest,
    @Body() _body: CompletePlacementDto,
  ) {
    void _body;
    return this.placementTest.markComplete(req.user.sub);
  }
}
