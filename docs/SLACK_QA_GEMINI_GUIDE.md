# Slack QA Bug Reporter with Gemini, Graphify & PR Previews

This guide outlines how Explys automates bug fixing directly from Slack QA reports.

---

## 🚀 Overview

When a QA engineer reports a bug in Slack, the system:
1. **Parses the bug report**: Extracts symptom descriptions, component names, and failure scenarios.
2. **Consults Graphify Knowledge Graph**: Queries `graphify` and `graphify-out/graph.json` to pinpoint relevant AST symbols, components, controllers, and dependency chains.
3. **Engages Google Gemini**: Analyzes the root cause and generates minimal, targeted code changes according to `AGENTS.md` rules.
4. **Branches & Verifies**:
   - Creates a dedicated branch (`fix/qa-slack-<timestamp>-<slug>`).
   - Applies the fix safely.
   - Runs type-checks (`npm run type-check`) and tests.
   - Self-heals if errors occur by feeding compiler diagnostics back to Gemini.
   - Synchronizes local AST via `graphify update .`.
5. **Opens Pull Request with Live Preview**:
   - Pushes branch to GitHub origin.
   - Opens PR containing root cause analysis, QA verification steps, and a live preview URL.
6. **Replies to Slack**: Posts the PR link and Preview URL back to the Slack QA channel/thread.

```
+---------------+      +-------------------------+      +--------------------------+
|  QA in Slack  | ---> | GitHub Action / Backend | ---> | Graphify Knowledge Graph |
+---------------+      +-------------------------+      +--------------------------+
                                  |                                   |
                                  v                                   v
                       +--------------------+            +-------------------------+
                       |   Google Gemini    | <--------- | AST & Code Slice Context|
                       +--------------------+            +-------------------------+
                                  |
                                  v
                       +--------------------+
                       | Fix Branch + Tests |
                       +--------------------+
                                  |
                                  v
+---------------+      +--------------------+
| Slack Thread  | <--- | PR + Deploy Preview|
+---------------+      +--------------------+
```

---

## 🛠️ Components

| Component | Path | Description |
| :--- | :--- | :--- |
| **Agent CLI & Runner** | [scripts/slack-qa-agent/run.ts](file:///Users/ivankoltsov/Workspaces/explys/scripts/slack-qa-agent/run.ts) | Main orchestrator |
| **Graphify Context Engine** | [scripts/slack-qa-agent/graphify-context.ts](file:///Users/ivankoltsov/Workspaces/explys/scripts/slack-qa-agent/graphify-context.ts) | AST search & context assembler |
| **Gemini Fixer** | [scripts/slack-qa-agent/gemini-fixer.ts](file:///Users/ivankoltsov/Workspaces/explys/scripts/slack-qa-agent/gemini-fixer.ts) | Gemini AI integration with model fallback |
| **Patch Verifier** | [scripts/slack-qa-agent/patch-verifier.ts](file:///Users/ivankoltsov/Workspaces/explys/scripts/slack-qa-agent/patch-verifier.ts) | Patch applier, type-checker, graph synchronizer |
| **Git & PR Manager** | [scripts/slack-qa-agent/git-pr-manager.ts](file:///Users/ivankoltsov/Workspaces/explys/scripts/slack-qa-agent/git-pr-manager.ts) | Branching, commits, PR creation with preview |
| **Slack Notifier** | [scripts/slack-qa-agent/slack-notifier.ts](file:///Users/ivankoltsov/Workspaces/explys/scripts/slack-qa-agent/slack-notifier.ts) | Threaded Slack progress updates |
| **Backend Webhook** | [backend/src/slack-qa/](file:///Users/ivankoltsov/Workspaces/explys/backend/src/slack-qa) | NestJS endpoint for `/qa-bug` slash commands |
| **GitHub Workflow** | [.github/workflows/slack-qa-gemini-fix.yml](file:///Users/ivankoltsov/Workspaces/explys/.github/workflows/slack-qa-gemini-fix.yml) | Automated CI runner |
| **PR Preview Workflow** | [.github/workflows/pr-preview.yml](file:///Users/ivankoltsov/Workspaces/explys/.github/workflows/pr-preview.yml) | Builds preview bundle and generates preview URL |

---

## ⚙️ Configuration & Secrets

### 1. GitHub Repository Secrets
Navigate to **GitHub Repository Settings → Secrets and variables → Actions** and add:

- `GEMINI_API_KEY`: Google AI Studio API Key.
- `GITHUB_TOKEN`: Built-in GitHub token (ensure **Read and Write permissions** are enabled under *Settings → Actions → General → Workflow permissions*).
- `SLACK_BOT_TOKEN`: `xoxb-...` token with `chat:write` scope.
- `SLACK_WEBHOOK_URL`: (Optional) Incoming webhook URL for fallback notifications.

### 2. Backend Environment Variables (VPS / `.env`)
Add to `backend/.env`:
```bash
SLACK_SIGNING_SECRET=your_slack_signing_secret_here
GITHUB_TOKEN=ghp_...
GITHUB_OWNER=ttekit
GITHUB_REPO=explys
```

---

## 📱 How to Trigger

### Option A: From Slack (Slash Command)
Configure your Slack App slash command:
- **Command:** `/qa-bug`
- **Request URL:** `https://api.explys.com/slack/qa-bug`
- **Usage:**
  ```slack
  /qa-bug Hero stats section shows magic offset +3259 instead of public stats endpoint
  ```

### Option B: Trigger via GitHub Actions UI
1. Go to **Actions → Slack QA Bug Fix with Gemini & Graphify**.
2. Click **Run workflow**.
3. Fill in:
   - **Bug Description**: `Hero stats component has magic offset +3259`
   - **QA Reporter**: `qa-alex`
   - **Dry run**: `false` (or `true` to simulate)
4. Click **Run workflow**.

### Option C: Run Locally via CLI
```bash
# Dry run simulation (no git push or PR creation)
npx tsx scripts/slack-qa-agent/run.ts \
  --dry-run \
  --bug "Hero stats component has magic offset +3259" \
  --reporter "qa-alex"

# Real run creating branch, pushing, and opening PR
GEMINI_API_KEY=... GITHUB_TOKEN=... npx tsx scripts/slack-qa-agent/run.ts \
  --bug "Hero stats component has magic offset +3259" \
  --reporter "qa-alex"
```

---

## 👥 Review & Merge Process

1. **For QA Engineers:**
   - Click the **Live Preview URL** attached to the Slack message or PR.
   - Follow the **QA Verification Steps** listed in the PR body.
   - If resolved, add a comment on GitHub or Slack: `:white_check_mark: Verified on preview`.
2. **For Developers:**
   - Inspect the code diff in the PR against `AGENTS.md` guidelines.
   - Confirm quality gates passed (typecheck, tests, Graphify sync).
   - Merge PR into base branch.
