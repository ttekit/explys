import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { GeminiFixer } from "./gemini-fixer";
import { SlackBugReport, GraphifyAnalysisContext } from "./types";

const mockBugReport: SlackBugReport = {
  id: "test-bug-1",
  reporter: "qa-tester",
  channel: "qa-bugs",
  text: "Turnstile captcha throws unhandled exception on timeout",
};

const mockGraphContext: GraphifyAnalysisContext = {
  queryTerms: ["turnstile", "captcha"],
  matchedNodes: [
    {
      name: "TurnstileProvider",
      file: "backend/src/auth/provider/turnstile.provider.ts",
      line: 15,
      community: 1,
      snippet: "// Turnstile provider snippet",
    },
  ],
  matchedEdges: [],
  relevantFiles: ["backend/src/auth/provider/turnstile.provider.ts"],
  assembledCodeContext: "// Turnstile provider snippet",
};

const mockValidProposal = {
  bugSummary: "Make turnstile error handling resilient",
  rootCauseAnalysis: "Turnstile verification timed out without try/catch guard.",
  filesToModify: [
    {
      path: "backend/src/auth/provider/turnstile.provider.ts",
      action: "modify",
      explanation: "Add timeout guard and fallback.",
      originalSnippet: "// old turnstile code",
      replacementContent: "// new resilient code",
    },
  ],
  qaVerificationSteps: ["1. Test turnstile timeout."],
  devReviewNotes: "Turnstile fallback handling improved.",
};

describe("GeminiFixer Multi-Provider Resilience & Failover", () => {
  test("generates mock proposal when no API keys are provided", async () => {
    const fixer = new GeminiFixer({
      geminiApiKey: "",
      openAiApiKey: "",
    });

    assert.equal(fixer.hasAvailableProvider(), false);
    const proposal = await fixer.generateFix(mockBugReport, mockGraphContext);
    assert.match(proposal.bugSummary, /\[Dry Run \/ Mock\]/);
  });

  test("uses Gemini by default when GEMINI_API_KEY is available and succeeds", async () => {
    let calledUrl = "";
    const mockFetch: typeof fetch = async (input, init) => {
      calledUrl = input.toString();
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(mockValidProposal) }],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const fixer = new GeminiFixer({
      geminiApiKey: "test-gemini-key",
      openAiApiKey: "test-openai-key",
      sleepDelayMs: 0,
      fetchFn: mockFetch,
    });

    assert.equal(fixer.getActiveProvider(), "gemini");
    const proposal = await fixer.generateFix(mockBugReport, mockGraphContext);

    assert.equal(proposal.bugSummary, mockValidProposal.bugSummary);
    assert.match(calledUrl, /generativelanguage\.googleapis\.com/);
    assert.equal(fixer.getActiveProvider(), "gemini");
    assert.equal(fixer.getGeminiConsecutiveErrors(), 0);
  });

  test("switches from Gemini to OpenAI when Gemini encounters 3 consecutive errors", async () => {
    const callLog: string[] = [];

    const mockFetch: typeof fetch = async (input, init) => {
      const url = input.toString();
      if (url.includes("generativelanguage.googleapis.com")) {
        callLog.push("gemini-error-503");
        return new Response(
          JSON.stringify({
            error: {
              code: 503,
              message: "Model is currently experiencing high demand.",
              status: "UNAVAILABLE",
            },
          }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("api.openai.com")) {
        callLog.push("openai-success");
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify(mockValidProposal),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Not found", { status: 404 });
    };

    const fixer = new GeminiFixer({
      geminiApiKey: "test-gemini-key",
      openAiApiKey: "test-openai-key",
      errorThreshold: 3,
      sleepDelayMs: 0,
      fetchFn: mockFetch,
    });

    assert.equal(fixer.getActiveProvider(), "gemini");
    const proposal = await fixer.generateFix(mockBugReport, mockGraphContext);

    assert.equal(proposal.bugSummary, mockValidProposal.bugSummary);
    // Should have tried Gemini 3 times, then switched to OpenAI and succeeded
    assert.deepEqual(callLog, [
      "gemini-error-503",
      "gemini-error-503",
      "gemini-error-503",
      "openai-success",
    ]);
    assert.equal(fixer.getActiveProvider(), "openai");
    assert.equal(fixer.getGeminiConsecutiveErrors(), 0);
    assert.equal(fixer.getOpenAiConsecutiveErrors(), 0);
  });

  test("switches from OpenAI back to Gemini when OpenAI encounters 3 consecutive errors", async () => {
    const callLog: string[] = [];

    const mockFetch: typeof fetch = async (input, init) => {
      const url = input.toString();
      if (url.includes("api.openai.com")) {
        callLog.push("openai-error-429");
        return new Response(
          JSON.stringify({
            error: {
              message: "You exceeded your current quota.",
              type: "insufficient_quota",
              code: "insufficient_quota",
            },
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }

      if (url.includes("generativelanguage.googleapis.com")) {
        callLog.push("gemini-success");
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(mockValidProposal) }],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response("Not found", { status: 404 });
    };

    const fixer = new GeminiFixer({
      geminiApiKey: "test-gemini-key",
      openAiApiKey: "test-openai-key",
      initialProvider: "openai",
      errorThreshold: 3,
      sleepDelayMs: 0,
      fetchFn: mockFetch,
    });

    assert.equal(fixer.getActiveProvider(), "openai");
    const proposal = await fixer.generateFix(mockBugReport, mockGraphContext);

    assert.equal(proposal.bugSummary, mockValidProposal.bugSummary);
    // Should have tried OpenAI 3 times, then switched back to Gemini and succeeded
    assert.deepEqual(callLog, [
      "openai-error-429",
      "openai-error-429",
      "openai-error-429",
      "gemini-success",
    ]);
    assert.equal(fixer.getActiveProvider(), "gemini");
    assert.equal(fixer.getOpenAiConsecutiveErrors(), 0);
    assert.equal(fixer.getGeminiConsecutiveErrors(), 0);
  });

  test("resets consecutive error count when provider succeeds after 1 failure", async () => {
    let attempt = 0;
    const mockFetch: typeof fetch = async (input, init) => {
      attempt++;
      if (attempt === 1) {
        return new Response("503 Service Unavailable", { status: 503 });
      }
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(mockValidProposal) }],
              },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const fixer = new GeminiFixer({
      geminiApiKey: "test-gemini-key",
      openAiApiKey: "test-openai-key",
      errorThreshold: 3,
      sleepDelayMs: 0,
      fetchFn: mockFetch,
    });

    const proposal = await fixer.generateFix(mockBugReport, mockGraphContext);
    assert.equal(proposal.bugSummary, mockValidProposal.bugSummary);
    assert.equal(fixer.getActiveProvider(), "gemini");
    assert.equal(fixer.getGeminiConsecutiveErrors(), 0);
  });
});
