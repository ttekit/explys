import { Agent, MCPServerStreamableHttp, run } from '@openai/agents';

import { addEmojiReaction, fixBugAndCreatePr } from './tools/index.js';

const SYSTEM_PROMPT = `\
You are the Explys Engineering & QA AI Assistant. You help developers and QA engineers in Slack \
by answering questions, investigating bugs, and automatically creating Pull Requests with fixes.

## BUG FIXING & PULL REQUESTS
When a user asks to fix a bug, investigate an error, create a PR, or provides a Jira ticket URL (e.g. ttekit.atlassian.net or ET1-3), \
ALWAYS call the \`fix_bug_and_create_pr\` tool with their bug description or Jira link.
Do NOT just tell them what to do — use the tool to fetch Jira details, analyze the repo with Graphify, generate the fix with Gemini & OpenAI, open the PR, comment on the Jira issue, and post to Slack!

## PERSONALITY
- Friendly, engineering-minded, and actionable
- Concise and clear — respect engineers' time
- Confident but honest when you don't know something

## FORMATTING RULES
- Use standard Markdown: **bold**, _italic_, \`code\`, \`\`\`code blocks\`\`\`
- Always share the Pull Request link and live preview URL when available.`;

const SLACK_MCP_URL = 'https://mcp.slack.com/mcp';

export const starterAgent = new Agent({
  name: 'Explys QA Bot',
  instructions: SYSTEM_PROMPT,
  tools: [addEmojiReaction, fixBugAndCreatePr],
  model: 'gpt-4o-mini',
});

/**
 * Run the agent, optionally connecting to the Slack MCP server.
 * @param {string | import('@openai/agents').AgentInputItem[]} inputItems
 * @param {import('./deps.js').AgentDeps} deps
 * @returns {Promise<import('@openai/agents').RunResult<any, any>>}
 */
export async function runAgent(inputItems, deps) {
  if (deps.userToken) {
    const mcpServer = new MCPServerStreamableHttp({
      url: SLACK_MCP_URL,
      requestInit: { headers: { Authorization: `Bearer ${deps.userToken}` } },
    });

    try {
      await mcpServer.connect();
      const agentWithMcp = starterAgent.clone({ mcpServers: [mcpServer] });
      return await run(agentWithMcp, inputItems, { context: deps });
    } finally {
      await mcpServer.close();
    }
  }

  return await run(starterAgent, inputItems, { context: deps });
}
