import {
  SlackBugReport,
  GeminiFixProposal,
  PullRequestResult,
  VerificationResult,
} from "./types";
import { resolveApiKey } from "./gemini-fixer";

export class SlackNotifier {
  private botToken: string;
  private defaultWebhookUrl: string;

  constructor() {
    this.botToken = resolveApiKey("SLACK_BOT_TOKEN");
    this.defaultWebhookUrl = resolveApiKey("SLACK_WEBHOOK_URL");
  }

  private async sendMessage(
    bugReport: SlackBugReport,
    text: string,
    dryRun: boolean = false
  ): Promise<void> {
    if (
      dryRun ||
      (!this.botToken && !this.defaultWebhookUrl && !bugReport.responseUrl)
    ) {
      console.log("\n--- [SLACK NOTIFICATION PREVIEW] ---");
      console.log(text);
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
            text,
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
            text,
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
          body: JSON.stringify({ text }),
        });
      } catch (err) {
        console.warn("Failed to post to Slack Webhook:", err);
      }
    }
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

    const jiraLine = bugReport.jiraIssueUrl
      ? `🎫 *Jira Ticket:* <${bugReport.jiraIssueUrl}|${bugReport.jiraIssueKey || "View Issue"}>\n`
      : "";

    const messageText = `🚀 *Automated PR & Preview Ready for QA Bug Report*

*Bug:* ${proposal.bugSummary}
*Reported by:* <@${bugReport.reporter}>
${jiraLine}
🔗 *Pull Request:* <${pr.prUrl}|#${pr.prNumber} ${pr.title}>
🌐 *Live Preview URL:* <${pr.previewUrl}|Open Preview Deployment>

*QA Verification Steps:*
${qaSteps}

*Next Steps:*
• <@${bugReport.reporter}> please verify the fix on the preview link.
• Engineering team please review the PR diff and merge!`;

    await this.sendMessage(bugReport, messageText, dryRun);

    // Cross-post to dedicated Slack PRs channel (e.g. #prs)
    const rawPrsChannel = resolveApiKey("SLACK_PRS_CHANNEL") || "prs";
    const prsChannel = rawPrsChannel.replace(/^#/, "");
    if (!dryRun && this.botToken && prsChannel && prsChannel !== bugReport.channel) {
      try {
        await fetch("https://slack.com/api/chat.postMessage", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.botToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            channel: prsChannel,
            text: messageText,
          }),
        });
        console.log(`-> Cross-posted PR announcement to Slack #${prsChannel}.`);
      } catch (err: any) {
        console.warn(`Failed to cross-post to Slack #${prsChannel}:`, err.message);
      }
    }
  }

  public async notifyNoChanges(
    bugReport: SlackBugReport,
    proposal: GeminiFixProposal,
    dryRun: boolean = false
  ): Promise<void> {
    const messageText = `ℹ️ *Explys AI Bug Analysis Report (No Code Changes)*

*Summary:* ${proposal.bugSummary}
*Reported by:* <@${bugReport.reporter}>

🔍 *Root Cause Diagnosis:*
${proposal.rootCauseAnalysis}

⚠️ *Status:* The AI analyzed the request and diagnosed the issue, but no direct code modifications were produced.
• *Reason:* The request appears to be a large new feature specification or requires manual design clarification.
• *Action Taken:* Aborted Pull Request creation to prevent creating empty or bogus PRs.`;

    await this.sendMessage(bugReport, messageText, dryRun);
  }

  public async notifyPatchFailed(
    bugReport: SlackBugReport,
    proposal: GeminiFixProposal,
    validationErrors: string[],
    dryRun: boolean = false
  ): Promise<void> {
    const errorList = validationErrors.map((e) => `• ${e}`).join("\n");
    const messageText = `⚠️ *Explys AI Fix Aborted — Patch Application Failed*

*Bug:* ${proposal.bugSummary}
*Reported by:* <@${bugReport.reporter}>

❌ *Validation Errors:*
${errorList}

• *Action Taken:* None of the proposed code edits matched existing repository files. Refused to create an invalid Pull Request.`;

    await this.sendMessage(bugReport, messageText, dryRun);
  }

  public async notifyVerificationFailed(
    bugReport: SlackBugReport,
    proposal: GeminiFixProposal,
    verification: VerificationResult,
    dryRun: boolean = false
  ): Promise<void> {
    const errorSnippet = verification.errors
      .slice(0, 3)
      .map((e) => `\`\`\`${e.slice(0, 300)}\`\`\``)
      .join("\n");

    const messageText = `❌ *Explys Quality Gate Failed — PR Aborted*

*Bug:* ${proposal.bugSummary}
*Reported by:* <@${bugReport.reporter}>

⚠️ *Quality Gate Failures (Types / Unit Tests):*
${errorSnippet}

• *Action Taken:* The proposed fix did not pass automated verification. Refused to open a broken Pull Request into the repository.`;

    await this.sendMessage(bugReport, messageText, dryRun);
  }
}
