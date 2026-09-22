import {
  Controller,
  Post,
  Body,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from "@nestjs/common";
import { SlackQaService, SlackWebhookPayload } from "./slack-qa.service";
import type { Request } from "express";

@Controller("slack")
export class SlackQaController {
  constructor(private readonly slackQaService: SlackQaService) {}

  @Post("qa-bug")
  @HttpCode(HttpStatus.OK)
  async handleQaBug(
    @Body() body: SlackWebhookPayload,
    @Headers("x-slack-signature") signature: string | undefined,
    @Headers("x-slack-request-timestamp") timestamp: string | undefined,
    @Req() req: Request
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(body);
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
