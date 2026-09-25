import * as fs from "fs";
import * as path from "path";
import {
  SlackBugReport,
  GraphifyAnalysisContext,
  GeminiFixProposal,
} from "./types";

export type AiProvider = "gemini" | "openai";

export function resolveApiKey(envVar: string, explicitKey?: string): string {
  if (explicitKey !== undefined) return explicitKey;
  if (process.env[envVar]) return process.env[envVar]!;
  try {
    const envPath = path.resolve(process.cwd(), "backend/.env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      const match = content.match(new RegExp(`^${envVar}=["']?([^"'\\r\\n]+)["']?`, "m"));
      if (match) return match[1].trim();
    }
  } catch {}
  return "";
}

export interface GeminiFixerOptions {
  geminiApiKey?: string;
  openAiApiKey?: string;
  geminiModel?: string;
  openAiModel?: string;
  initialProvider?: AiProvider;
  errorThreshold?: number;
  sleepDelayMs?: number;
  fetchFn?: typeof fetch;
}

export class GeminiFixer {
  private geminiApiKey: string;
  private openAiApiKey: string;
  private geminiModel: string;
  private openAiModel: string;
  private activeProvider: AiProvider;
  private geminiConsecutiveErrors: number = 0;
  private openAiConsecutiveErrors: number = 0;
  private readonly errorThreshold: number;
  private readonly sleepDelayMs: number;
  private readonly fetchFn: typeof fetch;

  private geminiModels: string[];
  private geminiModelIndex: number = 0;
  private openAiModels: string[];
  private openAiModelIndex: number = 0;
  private lastDiagnosticProposal: GeminiFixProposal | null = null;

  constructor(
    apiKeyOrOptions?: string | GeminiFixerOptions,
    model?: string
  ) {
    if (typeof apiKeyOrOptions === "object" && apiKeyOrOptions !== null) {
      this.geminiApiKey = resolveApiKey("GEMINI_API_KEY", apiKeyOrOptions.geminiApiKey);
      this.openAiApiKey = resolveApiKey("OPENAI_API_KEY", apiKeyOrOptions.openAiApiKey);
      this.geminiModel = apiKeyOrOptions.geminiModel || process.env.GEMINI_MODEL || "gemini-3.5-flash";
      this.openAiModel = apiKeyOrOptions.openAiModel || process.env.OPENAI_MODEL || "gpt-4o-mini";
      this.errorThreshold = apiKeyOrOptions.errorThreshold ?? 3;
      this.sleepDelayMs = apiKeyOrOptions.sleepDelayMs ?? 1000;
      this.fetchFn = apiKeyOrOptions.fetchFn ?? fetch;

      if (apiKeyOrOptions.initialProvider) {
        this.activeProvider = apiKeyOrOptions.initialProvider;
      } else {
        this.activeProvider = this.geminiApiKey ? "gemini" : (this.openAiApiKey ? "openai" : "gemini");
      }
    } else {
      this.geminiApiKey = resolveApiKey("GEMINI_API_KEY", apiKeyOrOptions);
      this.openAiApiKey = resolveApiKey("OPENAI_API_KEY");
      this.geminiModel = model || process.env.GEMINI_MODEL || "gemini-3.5-flash";
      this.openAiModel = process.env.OPENAI_MODEL || "gpt-4o-mini";
      this.errorThreshold = 3;
      this.sleepDelayMs = 1000;
      this.fetchFn = fetch;
      this.activeProvider = this.geminiApiKey ? "gemini" : (this.openAiApiKey ? "openai" : "gemini");
    }

    this.geminiModels = Array.from(
      new Set([
        this.geminiModel,
        "gemini-3.5-flash",
        "gemini-3.6-flash",
        "gemini-3.7-flash",
        "gemini-3-flash-preview",
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
      ])
    );

    this.openAiModels = Array.from(
      new Set([
        this.openAiModel,
        "gpt-4o-mini",
        "gpt-4o",
        "o3-mini",
        "gpt-4-turbo",
      ])
    );
  }

  public getActiveProvider(): AiProvider {
    return this.activeProvider;
  }

  public getGeminiConsecutiveErrors(): number {
    return this.geminiConsecutiveErrors;
  }

  public getOpenAiConsecutiveErrors(): number {
    return this.openAiConsecutiveErrors;
  }

  public hasAvailableProvider(): boolean {
    return Boolean(this.geminiApiKey || this.openAiApiKey);
  }

  private buildPrompts(
    bugReport: SlackBugReport,
    graphContext: GraphifyAnalysisContext,
    previousErrors: string[] = []
  ): { systemPrompt: string; userPrompt: string } {
    const systemPrompt = `You are a senior fullstack engineer working on the Explys learning platform (NestJS backend, React 19 + Vite frontend, Expo mobile).
A QA engineer has reported a bug in Slack. You have been provided with:
1. The bug description from Slack
2. Structural context from Graphify Knowledge Graph (matched nodes, dependency relations, file snippets)
3. Any previous compiler/test error feedback (if this is a retry)

Your task:
1. Analyze the bug and determine the exact root cause.
2. Produce targeted code edits to fix the bug cleanly according to project conventions.
3. Formulate clear QA verification steps so the QA reporter can test the fix on a deploy preview.
4. Formulate technical notes for the developer who will review and merge the PR.

CRITICAL INSTRUCTIONS:
- You must respond ONLY with a valid JSON object matching the JSON schema below.
- Do NOT output any explanation outside the JSON.
- Every modified file must specify:
  - 'path': relative path to the file (e.g. 'frontend/src/components/landing/HeroStats.tsx')
  - 'action': 'modify' | 'create' | 'delete'
  - 'explanation': why this change fixes the bug
  - 'originalSnippet': exact lines of code currently in the file to be replaced (must match existing file content exactly)
  - 'replacementContent': the new code that replaces 'originalSnippet'
- Be minimal and precise. Avoid unnecessary rewrites.
- MANDATORY FOR CODE EDITS: 'filesToModify' must contain at least 1 file modification. If multiple files need changes, list all of them. If the request is a complex feature, implement the primary component or entry point in the relevant files. Never return an empty 'filesToModify' array unless no relevant code files exist.
- MULTI-LANGUAGE REPORTS: The bug description may be in Ukrainian, English, or any other language. Understand the requirements regardless of language, and write code modifications adhering to the repository conventions.`;

    const userPrompt = `
### QA Bug Report (Slack)
Reporter: ${bugReport.reporter}
Channel: ${bugReport.channel || "qa-bugs"}
Description:
${bugReport.text}

### Graphify Context
Query terms: ${graphContext.queryTerms.join(", ")}
Matched symbols: ${graphContext.matchedNodes.map((n) => `${n.name} (${n.file}:${n.line})`).join(", ")}
Relevant files: ${graphContext.relevantFiles.join(", ")}

### Code Context Snippets
${graphContext.assembledCodeContext || "(No direct AST snippet match found; check relevant files)"}

${
  previousErrors.length > 0
    ? `### PREVIOUS VERIFICATION ERRORS (Fix these!):
${previousErrors.join("\n")}`
    : ""
}

### Expected JSON Output Structure:
{
  "bugSummary": "Short 1-line summary of what was fixed",
  "rootCauseAnalysis": "Clear explanation of why the bug occurred and how it was resolved",
  "filesToModify": [
    {
      "path": "relative/path/to/file.ts",
      "action": "modify",
      "explanation": "Why this change is needed",
      "originalSnippet": "exact lines to replace",
      "replacementContent": "new replacement lines"
    }
  ],
  "qaVerificationSteps": [
    "Step 1: Open the preview deployment link",
    "Step 2: ..."
  ],
  "devReviewNotes": "Technical summary for the developer reviewing the PR"
}
`;
    return { systemPrompt, userPrompt };
  }

  private async tryGeminiOnce(
    systemPrompt: string,
    userPrompt: string,
    errorLogs: string[]
  ): Promise<GeminiFixProposal | null> {
    const modelName = this.geminiModels[this.geminiModelIndex % this.geminiModels.length];
    this.geminiModelIndex++;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.geminiApiKey}`;
    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    };

    try {
      console.log(`Connecting to Gemini API using model: ${modelName}...`);
      const response = await this.fetchFn(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        const data: any = await response.json();
        const candidateText =
          data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        const proposal = this.parseProposalJson(candidateText);
        if (proposal.filesToModify.length > 0) {
          this.geminiConsecutiveErrors = 0;
          return proposal;
        }
        this.lastDiagnosticProposal = proposal;
        console.warn(
          `⚠️ Model ${modelName} returned proposal with 0 filesToModify. Trying next model for code edits...`
        );
        return null;
      }

      if (response.status === 503 && this.sleepDelayMs > 0) {
        await new Promise((r) => setTimeout(r, this.sleepDelayMs));
      }

      const errText = await response.text();
      this.geminiConsecutiveErrors++;
      const msg = `Gemini API error (${modelName} - ${response.status}): ${errText}`;
      console.warn(`${msg} (Consecutive Gemini errors: ${this.geminiConsecutiveErrors})`);
      errorLogs.push(msg);
      return null;
    } catch (err: any) {
      this.geminiConsecutiveErrors++;
      const msg = `Gemini network error (${modelName}): ${err.message}`;
      console.warn(`${msg} (Consecutive Gemini errors: ${this.geminiConsecutiveErrors})`);
      errorLogs.push(msg);
      return null;
    }
  }

  private async tryOpenAiOnce(
    systemPrompt: string,
    userPrompt: string,
    errorLogs: string[]
  ): Promise<GeminiFixProposal | null> {
    const modelName = this.openAiModels[this.openAiModelIndex % this.openAiModels.length];
    this.openAiModelIndex++;

    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const body = {
      model: modelName,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
    };

    try {
      console.log(`Connecting to OpenAI API using model: ${modelName}...`);
      const response = await this.fetchFn(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.openAiApiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      if (response.ok) {
        const data: any = await response.json();
        const candidateText = data.choices?.[0]?.message?.content || "{}";
        const proposal = this.parseProposalJson(candidateText);
        if (proposal.filesToModify.length > 0) {
          this.openAiConsecutiveErrors = 0;
          return proposal;
        }
        this.lastDiagnosticProposal = proposal;
        console.warn(
          `⚠️ Model ${modelName} returned proposal with 0 filesToModify. Trying next model for code edits...`
        );
        return null;
      }

      if ((response.status === 503 || response.status === 429) && this.sleepDelayMs > 0) {
        await new Promise((r) => setTimeout(r, this.sleepDelayMs));
      }

      const errText = await response.text();
      this.openAiConsecutiveErrors++;
      const msg = `OpenAI API error (${modelName} - ${response.status}): ${errText}`;
      console.warn(`${msg} (Consecutive OpenAI errors: ${this.openAiConsecutiveErrors})`);
      errorLogs.push(msg);
      return null;
    } catch (err: any) {
      this.openAiConsecutiveErrors++;
      const msg = `OpenAI network error (${modelName}): ${err.message}`;
      console.warn(`${msg} (Consecutive OpenAI errors: ${this.openAiConsecutiveErrors})`);
      errorLogs.push(msg);
      return null;
    }
  }

  public async generateFix(
    bugReport: SlackBugReport,
    graphContext: GraphifyAnalysisContext,
    previousErrors: string[] = []
  ): Promise<GeminiFixProposal> {
    if (!this.hasAvailableProvider()) {
      return this.generateMockProposal(bugReport, graphContext, previousErrors);
    }

    const { systemPrompt, userPrompt } = this.buildPrompts(
      bugReport,
      graphContext,
      previousErrors
    );

    const errorLogs: string[] = [];
    const maxTotalAttempts = 15;
    let attempts = 0;

    while (attempts < maxTotalAttempts) {
      attempts++;

      if (this.activeProvider === "gemini") {
        if (!this.geminiApiKey) {
          if (this.openAiApiKey) {
            console.log("GEMINI_API_KEY unavailable. Switching to OPENAI_API_KEY...");
            this.activeProvider = "openai";
            continue;
          }
          break;
        }

        const proposal = await this.tryGeminiOnce(systemPrompt, userPrompt, errorLogs);
        if (proposal) {
          return proposal;
        }

        if (this.geminiConsecutiveErrors >= this.errorThreshold) {
          if (this.openAiApiKey) {
            console.warn(
              `⚠️ Gemini encountered ${this.geminiConsecutiveErrors} consecutive errors (threshold: ${this.errorThreshold}). Switching active provider to OPENAI_API_KEY!`
            );
            this.activeProvider = "openai";
            this.geminiConsecutiveErrors = 0;
          } else {
            console.warn(
              `⚠️ Gemini encountered ${this.geminiConsecutiveErrors} errors, but OPENAI_API_KEY is not configured.`
            );
          }
        }
      } else {
        if (!this.openAiApiKey) {
          if (this.geminiApiKey) {
            console.log("OPENAI_API_KEY unavailable. Switching to GEMINI_API_KEY...");
            this.activeProvider = "gemini";
            continue;
          }
          break;
        }

        const proposal = await this.tryOpenAiOnce(systemPrompt, userPrompt, errorLogs);
        if (proposal) {
          return proposal;
        }

        if (this.openAiConsecutiveErrors >= this.errorThreshold) {
          if (this.geminiApiKey) {
            console.warn(
              `⚠️ OpenAI encountered ${this.openAiConsecutiveErrors} consecutive errors (threshold: ${this.errorThreshold}). Switching active provider to GEMINI_API_KEY!`
            );
            this.activeProvider = "gemini";
            this.openAiConsecutiveErrors = 0;
          } else {
            console.warn(
              `⚠️ OpenAI encountered ${this.openAiConsecutiveErrors} errors, but GEMINI_API_KEY is not configured.`
            );
          }
        }
      }
    }

    if (this.lastDiagnosticProposal) {
      return this.lastDiagnosticProposal;
    }

    throw new Error(
      `All AI providers failed. Consecutive failures exceeded tolerance.\nErrors:\n${errorLogs.join("\n")}`
    );
  }

  private parseProposalJson(text: string): GeminiFixProposal {
    let cleanText = text.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const parsed = JSON.parse(cleanText);
    return {
      bugSummary: parsed.bugSummary || "Automated fix for reported bug",
      rootCauseAnalysis: parsed.rootCauseAnalysis || "No root cause provided.",
      filesToModify: Array.isArray(parsed.filesToModify)
        ? parsed.filesToModify
        : [],
      qaVerificationSteps: Array.isArray(parsed.qaVerificationSteps)
        ? parsed.qaVerificationSteps
        : ["Verify functionality in preview URL."],
      devReviewNotes: parsed.devReviewNotes || "Please review changes.",
    };
  }

  /**
   * Mock proposal for testing / offline dry-run when no API keys are set
   */
  private generateMockProposal(
    bugReport: SlackBugReport,
    graphContext: GraphifyAnalysisContext,
    previousErrors: string[]
  ): GeminiFixProposal {
    const topFile = graphContext.relevantFiles[0] || "frontend/src/App.tsx";
    return {
      bugSummary: `[Dry Run / Mock] Addressed: ${bugReport.text.slice(0, 60)}...`,
      rootCauseAnalysis: `Simulated diagnosis: Graphify identified symbols in ${topFile}. Root cause isolated to handling edge cases in ${graphContext.matchedNodes[0]?.name || "component"}.`,
      filesToModify: [
        {
          path: topFile,
          action: "modify",
          explanation: "Added null check and defensive guards based on Graphify context.",
          originalSnippet: "// dry-run simulation snippet",
          replacementContent: "// dry-run simulation replacement",
        },
      ],
      qaVerificationSteps: [
        "1. Open the preview deployment link attached to the PR.",
        "2. Navigate to the affected component.",
        "3. Confirm error does not reproduce under test conditions.",
      ],
      devReviewNotes:
        "Automated simulation generated via Graphify context. Verify AST boundaries before merging.",
    };
  }
}
