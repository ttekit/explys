import { GraphifyContextRetriever } from "./graphify-context";
import { GeminiFixer } from "./gemini-fixer";
import { PatchVerifier } from "./patch-verifier";
import { GitPrManager } from "./git-pr-manager";
import { SlackNotifier } from "./slack-notifier";
import { SlackBugReport, AgentRunOptions } from "./types";

export async function runSlackQaAgent(options: AgentRunOptions): Promise<void> {
  console.log("==================================================");
  console.log("🤖 Explys Slack QA Bug Agent — Gemini & Graphify");
  console.log("==================================================");

  const bugReport: SlackBugReport = {
    id: `qa-${Date.now()}`,
    reporter: options.reporter || "qa-engineer",
    channel: options.channel || "qa-bugs",
    threadTs: options.threadTs,
    text: options.bugText,
    reportedAt: new Date().toISOString(),
  };

  console.log(`\n📋 Bug Report Received from @${bugReport.reporter}:`);
  console.log(`"${bugReport.text}"\n`);

  // 1. Graphify Knowledge Graph Retrieval
  console.log("🔍 [Step 1] Querying Graphify Knowledge Graph...");
  const retriever = new GraphifyContextRetriever();
  const graphContext = retriever.getAnalysisContext(bugReport.text);

  console.log(`-> Query terms extracted: [${graphContext.queryTerms.join(", ")}]`);
  console.log(
    `-> Matched ${graphContext.matchedNodes.length} nodes across ${graphContext.relevantFiles.length} files:`
  );
  graphContext.matchedNodes.slice(0, 5).forEach((n) => {
    console.log(`   - ${n.name} (${n.file}:${n.line})`);
  });

  // 2. Gemini Fix Generation
  console.log("\n🧠 [Step 2] Generating fix proposal with Gemini...");
  const fixer = new GeminiFixer(undefined, options.model);
  let proposal = await fixer.generateFix(bugReport, graphContext);

  console.log(`-> Summary: ${proposal.bugSummary}`);
  console.log(`-> Root Cause: ${proposal.rootCauseAnalysis}`);
  console.log(`-> Files to touch: ${proposal.filesToModify.map((f) => f.path).join(", ") || "(none)"}`);

  // 3. Branching
  console.log("\n🌿 [Step 3] Preparing dedicated fix branch...");
  const gitManager = new GitPrManager();
  const baseBranch = options.baseBranch || gitManager.getCurrentBranch();

  let branchName = "";
  if (!options.dryRun) {
    branchName = gitManager.createBranch(proposal.bugSummary, baseBranch);
  } else {
    branchName = `fix/qa-slack-simulated-${Date.now()}`;
    console.log(`[DRY RUN] Simulated branch: ${branchName} (based on ${baseBranch})`);
  }

  // 4. Patch Application & Verification Loop
  console.log("\n🛠️ [Step 4] Applying patches and verifying...");
  const verifier = new PatchVerifier();
  const { applied, skipped } = verifier.applyChanges(
    proposal.filesToModify,
    options.dryRun
  );
  console.log(`-> Applied changes to: ${applied.join(", ") || "(none)"}`);
  if (skipped.length > 0) {
    console.warn(`-> Skipped changes for: ${skipped.join(", ")}`);
  }

  let verificationResult = {
    success: true,
    typeCheckPassed: true,
    testsPassed: true,
    summary: "Simulated verification passed.",
    errors: [] as string[],
    output: "Clean check.",
  };

  if (!options.dryRun && !options.skipVerification && applied.length > 0) {
    verificationResult = verifier.runVerification(applied);

    // Self-healing loop: if verification failed, give Gemini one chance to rectify
    if (!verificationResult.success) {
      console.warn("⚠️ Quality gates failed. Retrying with Gemini error feedback...");
      try {
        const retryProposal = await fixer.generateFix(
          bugReport,
          graphContext,
          verificationResult.errors
        );
        verifier.applyChanges(retryProposal.filesToModify, false);
        const retryVerification = verifier.runVerification(applied);
        if (retryVerification.success) {
          console.log("✅ Fix successfully self-healed!");
          proposal = retryProposal;
          verificationResult = retryVerification;
        }
      } catch (err) {
        console.warn("Self-healing attempt threw an error:", err);
      }
    }
  }

  // 5. Update Graphify Knowledge Graph
  if (!options.dryRun && applied.length > 0) {
    console.log("\n📊 [Step 5] Synchronizing Graphify AST graph...");
    verifier.updateGraphify();
  }

  // 6. Commit & Push
  console.log("\n🚀 [Step 6] Committing & pushing fix branch...");
  gitManager.commitAndPush(branchName, proposal, bugReport.reporter, options.dryRun);

  // 7. Create Pull Request with Preview
  console.log("\n🌐 [Step 7] Creating Pull Request with preview...");
  const pr = await gitManager.createPullRequest(
    branchName,
    baseBranch,
    bugReport,
    proposal,
    verificationResult,
    options.dryRun
  );
  console.log(`-> PR Created: ${pr.prUrl}`);
  console.log(`-> Live Preview: ${pr.previewUrl}`);

  // 8. Slack Notification
  console.log("\n💬 [Step 8] Sending notification to Slack QA channel...");
  const notifier = new SlackNotifier();
  await notifier.notifyPrReady(bugReport, proposal, pr, options.dryRun);

  console.log("\n✅ All done! QA and Developer have been notified.");
}

// CLI Execution Support
if (require.main === module || process.argv[1]?.endsWith("run.ts")) {
  const args = process.argv.slice(2);

  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };

  const hasFlag = (flag: string): boolean => args.includes(flag);

  const bugText =
    getArg("--bug") ||
    process.env.SLACK_BUG_TEXT ||
    "Hero stats component shows unexpected magic number offset +3259";

  const reporter =
    getArg("--reporter") || process.env.SLACK_REPORTER || "qa-engineer";

  const channel = getArg("--channel") || process.env.SLACK_CHANNEL || "qa-bugs";
  const threadTs = getArg("--thread-ts") || process.env.SLACK_THREAD_TS;
  const baseBranch = getArg("--base-branch") || process.env.BASE_BRANCH;
  const dryRun = hasFlag("--dry-run") || process.env.DRY_RUN === "true";
  const skipVerification = hasFlag("--skip-verify");
  const model = getArg("--model") || process.env.GEMINI_MODEL;

  runSlackQaAgent({
    bugText,
    reporter,
    channel,
    threadTs,
    baseBranch,
    dryRun,
    skipVerification,
    model,
  }).catch((err) => {
    console.error("❌ Slack QA Agent Error:", err);
    process.exit(1);
  });
}
