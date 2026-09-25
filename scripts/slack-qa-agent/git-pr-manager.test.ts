import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GitPrManager } from "./git-pr-manager";
import {
  SlackBugReport,
  GeminiFixProposal,
  VerificationResult,
} from "./types";

describe("GitPrManager — Branching & PR Formatting", () => {
  const manager = new GitPrManager();

  it("constructs GitHub Pages deploy preview URL according to repository conventions", () => {
    const preview162 = manager.getPreviewUrl(162);
    assert.match(preview162, /https:\/\/[^/]+\.github\.io\/[^/]+\/pr-preview\/pr-162\//);

    const preview999 = manager.getPreviewUrl(999);
    assert.match(preview999, /https:\/\/[^/]+\.github\.io\/[^/]+\/pr-preview\/pr-999\//);
  });

  it("simulates PR creation cleanly in dry-run mode", async () => {
    const bugReport: SlackBugReport = {
      id: "qa-test",
      reporter: "qa-tester",
      text: "Fix broken button style",
      reportedAt: new Date().toISOString(),
    };

    const proposal: GeminiFixProposal = {
      bugSummary: "Fix broken button style",
      rootCauseAnalysis: "CSS class missing",
      filesToModify: [],
      qaVerificationSteps: ["Check button rendering"],
      devReviewNotes: "LGTM",
    };

    const verification: VerificationResult = {
      success: true,
      typeCheckPassed: true,
      testsPassed: true,
      summary: "Clean check",
      output: "All checks passed.",
      errors: [],
    };

    const pr = await manager.createPullRequest(
      "fix/qa-slack-1234-test",
      "product",
      bugReport,
      proposal,
      verification,
      true // dryRun
    );

    assert.equal(pr.prNumber, 999);
    assert.match(pr.previewUrl, /pr-preview\/pr-999\//);
    assert.match(pr.body, /Live Deploy Preview/);
    assert.match(pr.body, /pr-preview\/pr-999\//);
  });
});
