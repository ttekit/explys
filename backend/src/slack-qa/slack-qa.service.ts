import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

export interface SlackWebhookPayload {
  token?: string;
  team_id?: string;
  channel_id?: string;
  channel_name?: string;
  user_id?: string;
  user_name?: string;
  command?: string;
  text?: string;
  response_url?: string;
  trigger_id?: string;
}

@Injectable()
export class SlackQaService {
  private readonly logger = new Logger(SlackQaService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Verifies Slack HMAC-SHA256 signature
   */
  public verifySlackSignature(
    signature: string | undefined,
    timestamp: string | undefined,
    rawBody: string
  ): boolean {
    const signingSecret = this.configService.get<string>("SLACK_SIGNING_SECRET");
    if (!signingSecret) {
      // If secret not configured in development, allow requests through
      return true;
    }

    if (!signature || !timestamp) {
      return false;
    }

    // Reject requests older than 5 minutes to prevent replay attacks
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
    if (parseInt(timestamp, 10) < fiveMinutesAgo) {
      return false;
    }

    const sigBasestring = `v0:${timestamp}:${rawBody}`;
    const mySignature =
      "v0=" +
      crypto
        .createHmac("sha256", signingSecret)
        .update(sigBasestring, "utf8")
        .digest("hex");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(mySignature, "utf8"),
        Buffer.from(signature, "utf8")
      );
    } catch {
      return false;
    }
  }

  /**
   * Dispatches workflow event to GitHub Actions
   */
  public async dispatchToGitHub(payload: SlackWebhookPayload): Promise<boolean> {
    const ghToken =
      this.configService.get<string>("GITHUB_TOKEN") ||
      this.configService.get<string>("GH_TOKEN");
    const repoOwner = this.configService.get<string>("GITHUB_OWNER") || "ttekit";
    const repoName = this.configService.get<string>("GITHUB_REPO") || "explys";

    if (!ghToken) {
      this.logger.warn("GITHUB_TOKEN not configured. Skipping repository_dispatch.");
      return false;
    }

    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/dispatches`;

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `token ${ghToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: "slack_qa_bug",
          client_payload: {
            text: payload.text || "",
            reporter: payload.user_name || "qa-reporter",
            channel: payload.channel_id || payload.channel_name || "qa-bugs",
            response_url: payload.response_url,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        this.logger.error(`GitHub dispatch failed (${res.status}): ${text}`);
        return false;
      }

      this.logger.log(`Dispatched Slack QA bug event to GitHub for @${payload.user_name}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to dispatch to GitHub: ${err.message}`);
      return false;
    }
  }
}
