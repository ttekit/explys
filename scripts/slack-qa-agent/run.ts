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
  console.log(
    `-> Files to touch: ${proposal.filesToModify.map((f) => f.path).join(", ") || "(none)"}`
  );

  const notifier = new SlackNotifier();

  // =========================================================================
  // VALIDATION GATE 1: AI Proposal must contain at least 1 file modification
  // =========================================================================
  if (proposal.filesToModify.length === 0) {
    console.warn("\n⚠️ [Validation Gate 1: Empty Proposal] AI produced 0 file modifications.");
    console.warn("-> The bug report is likely a complex feature specification or requires manual design.");
    console.warn("-> Aborting branch, commit, and Pull Request creation to prevent empty/bogus PRs.\n");

    await notifier.notifyNoChanges(bugReport, proposal, options.dryRun);
    return;
  }

  // =========================================================================
  // STEP 3: Patch Application & Codebase Validation
  // =========================================================================
  console.log("\n🛠️ [Step 3] Validating and applying proposed patches...");
  const verifier = new PatchVerifier();
  const { applied, skipped, validationErrors } = verifier.applyChanges(
    proposal.filesToModify,
    options.dryRun
  );
  console.log(`-> Applied changes to: ${applied.join(", ") || "(none)"}`);
  if (skipped.length > 0) {
    console.warn(`-> Skipped changes for: ${skipped.join(", ")}`);
    if (validationErrors.length > 0) {
      validationErrors.forEach((e) => console.warn(`   ❌ ${e}`));
    }
  }

  // =========================================================================
  // VALIDATION GATE 2: At least 1 proposed patch must apply cleanly
  // =========================================================================
  if (applied.length === 0) {
    console.error("\n❌ [Validation Gate 2: Patch Application Failed] None of the proposed changes matched the codebase.");
    console.error("-> Aborting Pull Request creation to avoid committing broken or hallucinated files.\n");

    await notifier.notifyPatchFailed(bugReport, proposal, validationErrors, options.dryRun);
    return;
  }

  // =========================================================================
  // STEP 4: Quality Gates (Verification Loop — Types & Tests)
  // =========================================================================
  console.log("\n🔍 [Step 4] Running Quality Gates (Type-check & Tests)...");
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

    // Self-healing loop: if verification failed, give AI one chance to rectify
    if (!verificationResult.success) {
      console.warn("⚠️ Quality gates failed. Retrying with AI error feedback...");
      try {
        const retryProposal = await fixer.generateFix(
          bugReport,
          graphContext,
          verificationResult.errors
        );
        if (retryProposal.filesToModify.length > 0) {
          verifier.applyChanges(retryProposal.filesToModify, false);
          const retryVerification = verifier.runVerification(applied);
          if (retryVerification.success) {
            console.log("✅ Fix successfully self-healed!");
            proposal = retryProposal;
            verificationResult = retryVerification;
          }
        }
      } catch (err) {
        console.warn("Self-healing attempt threw an error:", err);
      }
    }
  }

  // =========================================================================
  // VALIDATION GATE 3: Quality gates MUST pass before creating / pushing PR
  // =========================================================================
  if (!options.dryRun && !options.skipVerification && !verificationResult.success) {
    console.error("\n❌ [Validation Gate 3: Quality Gates Failed] Types or unit tests did not pass.");
    console.error(`-> Summary: ${verificationResult.summary}`);
    console.error("-> Refusing to create a broken Pull Request into the repository.\n");

    await notifier.notifyVerificationFailed(bugReport, proposal, verificationResult, options.dryRun);
    return;
  }

  // =========================================================================
  // STEP 5: Synchronize Graphify Knowledge Graph
  // =========================================================================
  if (!options.dryRun && applied.length > 0) {
    console.log("\n📊 [Step 5] Synchronizing Graphify AST graph...");
    verifier.updateGraphify();
  }

  // =========================================================================
  // STEP 6: Branching, Commit & Push (Only reached if all gates passed!)
  // =========================================================================
  console.log("\n🌿 [Step 6] Preparing dedicated fix branch...");
  const gitManager = new GitPrManager();
  const baseBranch = options.baseBranch || gitManager.getCurrentBranch();

  let branchName = "";
  if (!options.dryRun) {
    branchName = gitManager.createBranch(proposal.bugSummary, baseBranch);
  } else {
    branchName = `fix/qa-slack-simulated-${Date.now()}`;
    console.log(`[DRY RUN] Simulated branch: ${branchName} (based on ${baseBranch})`);
  }

  console.log("\n🚀 [Step 6b] Committing & pushing fix branch...");
  gitManager.commitAndPush(branchName, proposal, bugReport.reporter, options.dryRun);

  // =========================================================================
  // STEP 7: Create Pull Request with Preview
  // =========================================================================
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

  // =========================================================================
  // STEP 8: Slack Notification
  // =========================================================================
  console.log("\n💬 [Step 8] Sending notification to Slack QA channel...");
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
