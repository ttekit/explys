import {
  SlackBugReport,
  GeminiFixProposal,
  PullRequestResult,
} from "./types";

export class SlackNotifier {
  private botToken: string;
  private defaultWebhookUrl: string;

  constructor() {
    this.botToken = process.env.SLACK_BOT_TOKEN || "";
    this.defaultWebhookUrl = process.env.SLACK_WEBHOOK_URL || "";
  }

  public async notifyPrReady(
    bugReport: SlackBugReport,
    proposal: GeminiFixProposal,
    pr: PullRequestResult,
    dryRun: boolean = false
  ): Promise<void> {
    const qaSteps = proposal.qaVerificationSteps
      .map((s, idx) => `  ${idx + 1}. ${s}`)
      .join("\n");

    const messageText = `🚀 *Automated PR & Preview Ready for QA Bug Report*

*Bug:* ${proposal.bugSummary}
*Reported by:* <@${bugReport.reporter}>

🔗 *Pull Request:* <${pr.prUrl}|#${pr.prNumber} ${pr.title}>
🌐 *Live Preview URL:* <${pr.previewUrl}|Open Preview Deployment>

*QA Verification Steps:*
${qaSteps}

*Next Steps:*
• <@${bugReport.reporter}> please verify the fix on the preview link.
• Engineering team please review the PR diff and merge!`;

    if (dryRun || (!this.botToken && !this.defaultWebhookUrl && !bugReport.responseUrl)) {
      console.log("\n--- [SLACK NOTIFICATION PREVIEW] ---");
      console.log(messageText);
      console.log("------------------------------------\n");
      return;
    }

    // 1. If responseUrl is provided (from slash command)
    if (bugReport.responseUrl) {
      try {
        await fetch(bugReport.responseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            response_type: "in_channel",
            text: messageText,
          }),
        });
        return;
      } catch (err) {
        console.warn("Failed to post to Slack responseUrl:", err);
      }
    }

    // 2. If bot token and channel
    if (this.botToken && bugReport.channel) {
      try {
        await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channel: bugReport.channel,
            thread_ts: bugReport.threadTs,
            text: messageText,
          }),
        });
        return;
      } catch (err) {
        console.warn("Failed to post to Slack Web API:", err);
      }
    }

    // 3. Fallback to incoming webhook
    if (this.defaultWebhookUrl) {
      try {
        await fetch(this.defaultWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: messageText }),
        });
      } catch (err) {
        console.warn("Failed to post to Slack Webhook:", err);
      }
    }
  }
}
