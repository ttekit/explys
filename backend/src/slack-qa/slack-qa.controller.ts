import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  RawBodyRequest,
  UsePipes,
  ValidationPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import { Public } from "../auth/decorators/public.decorator";
import { SlackQaService } from "./slack-qa.service";
import { SlackWebhookDto } from "./dto/slack-webhook.dto";
import type { Request } from "express";

@ApiTags("slack-qa")
@Controller("slack")
@SkipThrottle()
@Public()
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: false,
    forbidNonWhitelisted: false,
  })
)
export class SlackQaController {
  constructor(private readonly slackQaService: SlackQaService) {}

  @Post(["qa-bug", "slash-command"])
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Slack slash command webhook endpoint for reporting QA bugs",
    description:
      "Receives /qa-bug slash command from Slack, validates Slack HMAC signature, and triggers the automated Gemini & Graphify bug fixing agent.",
  })
  @ApiConsumes("application/x-www-form-urlencoded", "application/json")
  @ApiBody({ type: SlackWebhookDto })
  @ApiResponse({
    status: 200,
    description: "Instant in-channel acknowledgment for Slack",
  })
  @ApiResponse({
    status: 401,
    description: "Invalid Slack request signature",
  })
  async handleQaBug(
    @Body() body: SlackWebhookDto,
    @Headers("x-slack-signature") signature: string | undefined,
    @Headers("x-slack-request-timestamp") timestamp: string | undefined,
    @Req() req: RawBodyRequest<Request>
  ) {
    const rawBody = req.rawBody
      ? req.rawBody.toString("utf8")
      : typeof (req as any).body === "string"
        ? (req as any).body
        : JSON.stringify(body || {});

    const isValid = this.slackQaService.verifySlackSignature(
      signature,
      timestamp,
      rawBody
    );

    if (!isValid) {
      throw new UnauthorizedException("Invalid Slack request signature");
    }

    const bugText = body.text?.trim();
    if (!bugText) {
      return {
        response_type: "ephemeral",
        text: "⚠️ Please provide a bug description. Example: `/qa-bug Hero stats shows +3259 magic number`",
      };
    }

    // Trigger async processing via GitHub Actions workflow dispatch
    this.slackQaService.dispatchToGitHub(body).catch((err) => {
      console.error("Async GitHub dispatch error:", err);
    });

    return {
      response_type: "in_channel",
      text: `🤖 *Explys Gemini QA Agent has picked up your bug report!*
> _"${bugText}"_

🔍 Analyzing code context with **Graphify Knowledge Graph**...
🧠 Generating fix with **Google Gemini**...
🌿 Creating dedicated fix branch & Pull Request with live preview...

_You will be notified in this thread with the PR and Preview link as soon as verification passes._`,
    };
  }
}
