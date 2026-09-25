import { AgentDeps, runAgent } from '../../agent/index.js';
import { executeFixBug } from '../../agent/tools/index.js';
import { conversationStore } from '../../thread-context/index.js';
import { buildFeedbackBlocks } from '../views/feedback-builder.js';

/**
 * Handle app_mention events and run the agent.
 * @param {import('@slack/bolt').AllMiddlewareArgs & import('@slack/bolt').SlackEventMiddlewareArgs<'app_mention'>} args
 * @returns {Promise<void>}
 */
export async function handleAppMentioned({ client, context, event, logger, say, sayStream, setStatus }) {
  try {
    const channelId = event.channel;
    const text = event.text || '';
    const threadTs = event.thread_ts || event.ts;
    const userId = /** @type {string} */ (context.userId);

    // Strip the bot mention from the text
    const cleanedText = text.replace(/<@[A-Z0-9]+>/g, '').trim();

    if (!cleanedText) {
      await say({
        text: "Hey there! How can I help you? Ask me anything and I'll do my best.",
        thread_ts: threadTs,
      });
      return;
    }

    // Set assistant thread status with loading messages if supported
    if (typeof setStatus === 'function') {
      await setStatus({
        status: 'Thinking\u2026',
        loading_messages: [
          'Teaching the hamsters to type faster\u2026',
          'Untangling the internet cables\u2026',
          'Consulting the office goldfish\u2026',
          'Polishing up the response just for you\u2026',
          'Convincing the AI to stop overthinking\u2026',
        ],
      });
    }

    // Get conversation history
    const history = conversationStore.getHistory(channelId, threadTs);
    /** @type {string | import('@openai/agents').AgentInputItem[]} */
    const inputItems = history ? [...history, { role: 'user', content: cleanedText }] : cleanedText;

    // Run the agent
    const deps = new AgentDeps(client, userId, channelId, threadTs, event.ts, context.userToken);
    const result = await runAgent(inputItems, deps);

    // Stream or post response in thread with feedback buttons
    const feedbackBlocks = buildFeedbackBlocks();
    if (typeof sayStream === 'function') {
      const streamer = sayStream();
      await streamer.append({ markdown_text: result.finalOutput });
      await streamer.stop({ blocks: feedbackBlocks });
    } else {
      await say({
        text: result.finalOutput,
        blocks: feedbackBlocks,
        thread_ts: threadTs,
      });
    }

    // Store conversation history
    conversationStore.setHistory(channelId, threadTs, result.history);
  } catch (e) {
    logger.error(`Failed to handle app mention: ${e}`);
    const text = event.text || '';
    const cleanedText = text.replace(/<@[A-Z0-9]+>/g, '').trim();
    const lower = cleanedText.toLowerCase();

    if (
      lower.includes('fix') ||
      lower.includes('bug') ||
      lower.includes('pr') ||
      lower.includes('error') ||
      /https?:\/\/[^\s]*atlassian\.net/i.test(cleanedText) ||
      /\b[A-Z0-9]+-\d+\b/i.test(cleanedText)
    ) {
      const errorMsg = /** @type {any} */ (e)?.message || e;
      await say({
        text: `⚡ _OpenAI Assistant encountered an issue (${errorMsg}). Falling back directly to Explys Gemini/Graphify Fix Engine..._`,
        thread_ts: event.thread_ts || event.ts,
      });
      const deps = new AgentDeps(
        client,
        /** @type {string} */ (context.userId),
        event.channel,
        event.thread_ts || event.ts,
        event.ts,
        context.userToken,
      );
      await executeFixBug({ bug_description: cleanedText }, deps);
      return;
    }

    await say({
      text: `:warning: Something went wrong! (${e})`,
      thread_ts: event.thread_ts || event.ts,
    });
  }
}
