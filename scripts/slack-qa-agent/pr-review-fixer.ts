import { execSync } from "child_process";
import { GraphifyContextRetriever } from "./graphify-context";
import { GeminiFixer } from "./gemini-fixer";
import { PatchVerifier } from "./patch-verifier";
import { SlackBugReport } from "./types";

interface PrReviewFixerOptions {
  prNumber: number;
  commentText?: string;
  errorLogs?: string;
  dryRun?: boolean;
}

export class PrReviewFixer {
  private workspaceRoot: string;
  private githubToken: string;
  private repoOwner: string;
  private repoName: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
    this.githubToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
    
    const remoteUrl = this.getRemoteUrl();
    const parsed = this.parseRepoSlug(remoteUrl);
    this.repoOwner = parsed.owner;
    this.repoName = parsed.repo;
  }

  private getRemoteUrl(): string {
    try {
      return execSync("git config --get remote.origin.url", {
        cwd: this.workspaceRoot,
        encoding: "utf-8",
      }).trim();
    } catch {
      return "https://github.com/ttekit/explys.git";
    }
  }

  private parseRepoSlug(url: string): { owner: string; repo: string } {
    const match = url.match(/[:/]([^/]+)\/([^/]+?)(?:\.git)?$/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    return { owner: "ttekit", repo: "explys" };
  }

  /**
   * Fetches PR details from GitHub API
   */
  public async getPrDetails(prNumber: number): Promise<{
    branchName: string;
    baseBranch: string;
    title: string;
    body: string;
  }> {
    if (!this.githubToken) {
      return {
        branchName: "current",
        baseBranch: "product",
        title: `PR #${prNumber}`,
        body: "",
      };
    }

    const res = await fetch(
      `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/pulls/${prNumber}`,
      {
        headers: {
          Authorization: `token ${this.githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch PR #${prNumber}: ${res.statusText}`);
    }

    const data: any = await res.json();
    return {
      branchName: data.head.ref,
      baseBranch: data.base.ref,
      title: data.title,
      body: data.body || "",
    };
  }

  /**
   * Fetches latest review comments and issue comments on the PR
   */
  public async getPrComments(prNumber: number): Promise<string[]> {
    if (!this.githubToken) return [];

    const comments: string[] = [];

    // 1. Issue comments
    try {
      const res = await fetch(
        `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/issues/${prNumber}/comments?per_page=20`,
        {
          headers: {
            Authorization: `token ${this.githubToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
      if (res.ok) {
        const data: any = await res.json();
        for (const c of data) {
          if (c.body && !c.body.includes("<!-- explys-preview-deploy-comment -->") && !c.body.includes("Explys Gemini Agent applied")) {
            comments.push(`@${c.user?.login}: ${c.body}`);
          }
        }
      }
    } catch {
      // ignore
    }

    // 2. Review line comments
    try {
      const res = await fetch(
        `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/pulls/${prNumber}/comments?per_page=20`,
        {
          headers: {
            Authorization: `token ${this.githubToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
      if (res.ok) {
        const data: any = await res.json();
        for (const c of data) {
          if (c.body) {
            comments.push(`Review comment on ${c.path}:${c.line || c.original_line || ""}: @${c.user?.login}: ${c.body}`);
          }
        }
      }
    } catch {
      // ignore
    }

    return comments;
  }

  /**
   * Main entrypoint to check PR comments / errors and apply fix with Gemini
   */
  public async fixPr(options: PrReviewFixerOptions): Promise<void> {
    console.log(`\n🔍 Analyzing PR #${options.prNumber} for review comments and errors...`);
    const prDetails = await this.getPrDetails(options.prNumber);
    console.log(`-> PR Branch: ${prDetails.branchName}`);

    let contextFeedback = options.commentText || "";
    if (!contextFeedback) {
      const comments = await this.getPrComments(options.prNumber);
      if (comments.length > 0) {
        contextFeedback = comments.slice(-5).join("\n\n");
      }
    }

    if (options.errorLogs) {
      contextFeedback = `${contextFeedback}\n\nCI Failure Logs:\n${options.errorLogs}`.trim();
    }

    if (!contextFeedback.trim()) {
      console.log("✅ No unresolved review comments or CI errors found on PR.");
      return;
    }

    console.log(`\n📋 Extracted PR Feedback to fix:`);
    console.log(`"${contextFeedback.slice(0, 300)}..."\n`);

    // 1. Graphify Context
    console.log("🔍 Consulting Graphify Knowledge Graph...");
    const retriever = new GraphifyContextRetriever();
    const graphContext = retriever.getAnalysisContext(contextFeedback);

    console.log(`-> Matched ${graphContext.matchedNodes.length} symbols across ${graphContext.relevantFiles.length} files.`);

    // 2. Gemini Fix Generation
    console.log("🧠 Generating fix with Gemini...");
    const fixer = new GeminiFixer();
    const bugReport: SlackBugReport = {
      id: `pr-${options.prNumber}`,
      reporter: "pr-reviewer",
      channel: `pr-${options.prNumber}`,
      text: `PR #${options.prNumber} review comments / error feedback:\n${contextFeedback}`,
    };

    const proposal = await fixer.generateFix(bugReport, graphContext);
    console.log(`-> Summary: ${proposal.bugSummary}`);
    console.log(`-> Files to modify: ${proposal.filesToModify.map((f) => f.path).join(", ") || "(none)"}`);

    if (proposal.filesToModify.length === 0) {
      console.log("No specific file modifications proposed. Skipping commit.");
      return;
    }

    // 3. Checkout PR branch if needed
    if (!options.dryRun && prDetails.branchName && prDetails.branchName !== "current") {
      try {
        execSync(`git fetch origin ${prDetails.branchName}`, { cwd: this.workspaceRoot });
        execSync(`git checkout ${prDetails.branchName}`, { cwd: this.workspaceRoot });
      } catch (e: any) {
        console.warn(`Could not checkout ${prDetails.branchName}: ${e.message}`);
      }
    }

    // 4. Apply Changes
    console.log("🛠️ Applying fixes...");
    const verifier = new PatchVerifier();
    const { applied } = verifier.applyChanges(proposal.filesToModify, options.dryRun);

    // 5. Verification
    let verificationSummary = "All checks passed.";
    if (!options.dryRun && applied.length > 0) {
      const verResult = verifier.runVerification(applied);
      verificationSummary = verResult.summary;
      verifier.updateGraphify();
    }

    // 6. Commit & Push
    if (!options.dryRun && applied.length > 0) {
      console.log("🚀 Committing and pushing fix to PR branch...");
      const commitMsg = `fix(pr): ${proposal.bugSummary}\n\nAutomated fix addressing review feedback & errors via Gemini & Graphify`;
      execSync("git add -A", { cwd: this.workspaceRoot });
      execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { cwd: this.workspaceRoot });
      execSync(`git push origin HEAD:${prDetails.branchName}`, { cwd: this.workspaceRoot });
      console.log(`Fix pushed to ${prDetails.branchName}.`);

      // 7. Post comment on PR
      if (this.githubToken) {
        const commentBody = `🤖 **Explys Gemini Agent applied a fix addressing review feedback / errors!**

**Summary:** ${proposal.bugSummary}

**Root Cause:**
${proposal.rootCauseAnalysis}

**Files Modified:**
${proposal.filesToModify.map((f) => `- \`${f.path}\`: ${f.explanation}`).join("\n")}

**Verification:**
- Quality Gates: ${verificationSummary}
- Graphify AST: Synchronized (\`graphify update .\`)

QA and reviewers: please re-verify on the live preview!`;

        await fetch(
          `https://api.github.com/repos/${this.repoOwner}/${this.repoName}/issues/${options.prNumber}/comments`,
          {
            method: "POST",
            headers: {
              Authorization: `token ${this.githubToken}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ body: commentBody }),
          }
        );
        console.log(`Posted confirmation comment on PR #${options.prNumber}.`);
      }
    } else {
      console.log(`[DRY RUN] Would commit and push fix to ${prDetails.branchName}`);
    }

    console.log("✅ PR review fix completed successfully!");
  }
}

// CLI Support
if (require.main === module || process.argv[1]?.endsWith("pr-review-fixer.ts")) {
  const args = process.argv.slice(2);
  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };
  const hasFlag = (flag: string): boolean => args.includes(flag);

  const prNumberStr = getArg("--pr") || process.env.PR_NUMBER || "162";
  const commentText = getArg("--comment") || process.env.PR_COMMENT;
  const errorLogs = getArg("--errors") || process.env.PR_ERRORS;
  const dryRun = hasFlag("--dry-run") || process.env.DRY_RUN === "true";

  const fixer = new PrReviewFixer();
  fixer
    .fixPr({
      prNumber: parseInt(prNumberStr, 10),
      commentText,
      errorLogs,
      dryRun,
    })
    .catch((err) => {
      console.error("❌ PR Review Fixer Error:", err);
      process.exit(1);
    });
}
