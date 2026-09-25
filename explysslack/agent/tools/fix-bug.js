import { tool } from '@openai/agents';
import { z } from 'zod';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../..');

export const fixBugAndCreatePr = tool({
  name: 'fix_bug_and_create_pr',
  description:
    'Analyzes the codebase using Graphify Knowledge Graph, generates targeted code fixes with Gemini (with OpenAI failover), validates types/tests, commits, and opens a Pull Request on GitHub with a live deploy preview.',
  parameters: z.object({
    bug_description: z
      .string()
      .describe('Detailed description of the bug or requested code change to fix.'),
    dry_run: z
      .boolean()
      .optional()
      .describe('If true, simulates the fix without pushing commits or creating a PR.'),
  }),
  execute: async ({ bug_description, dry_run = false }, context) => {
    const deps = /** @type {import('../deps.js').AgentDeps} */ (context?.context);

    if (deps?.client && deps?.channelId && deps?.threadTs) {
      await deps.client.chat
        .postMessage({
          channel: deps.channelId,
          thread_ts: deps.threadTs,
          text: `🤖 *Explys AI Fix Agent started!*
> _"${bug_description}"_

🔍 Consulting **Graphify Knowledge Graph**...
🧠 Generating fix with **Gemini & OpenAI Multi-Provider Engine**...
${dry_run ? '🧪 Mode: Dry-run simulation' : '🌿 Preparing fix branch & PR...'}`,
        })
        .catch(() => {});
    }

    return new Promise((resolve) => {
      const args = [
        'scripts/slack-qa-agent/run.ts',
        '--bug',
        bug_description,
        '--reporter',
        deps?.userId || 'slack-qa',
      ];
      if (dry_run) args.push('--dry-run');

      const proc = spawn('npx', ['tsx', ...args], {
        cwd: projectRoot,
        env: {
          ...process.env,
          PATH: process.env.PATH,
        },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => {
        stdout += d.toString();
      });

      proc.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      proc.on('close', async (code) => {
        if (code === 0) {
          const prMatch = stdout.match(/https:\/\/github\.com\/[^\s]+\/pull\/\d+/);
          const prUrl = prMatch ? prMatch[0] : null;

          const previewMatch = stdout.match(
            /https:\/\/ttekit\.github\.io\/explys\/pr-preview\/pr-\d+\//
          );
          const previewUrl = previewMatch ? previewMatch[0] : null;

          const summary = prUrl
            ? `✅ *Successfully applied fix and opened Pull Request!*\n• *PR Link:* ${prUrl}\n${previewUrl ? `• *Live Preview:* ${previewUrl}` : ''}`
            : `✅ *Successfully generated fix!* (Dry run simulation passed cleanly).`;

          if (deps?.client && deps?.channelId && deps?.threadTs) {
            await deps.client.chat
              .postMessage({
                channel: deps.channelId,
                thread_ts: deps.threadTs,
                text: summary,
              })
              .catch(() => {});
          }

          resolve(summary);
        } else {
          const errorMsg = `⚠️ Fix generation encountered an issue:\n\`\`\`${(stderr || stdout).slice(-600)}\`\`\``;
          if (deps?.client && deps?.channelId && deps?.threadTs) {
            await deps.client.chat
              .postMessage({
                channel: deps.channelId,
                thread_ts: deps.threadTs,
                text: errorMsg,
              })
              .catch(() => {});
          }
          resolve(errorMsg);
        }
      });
    });
  },
});
