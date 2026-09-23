import {
  SlackBugReport,
  GraphifyAnalysisContext,
  GeminiFixProposal,
} from "./types";

export class GeminiFixer {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || "";
    this.model = model || process.env.GEMINI_MODEL || "gemini-flash-latest";
  }

  public async generateFix(
    bugReport: SlackBugReport,
    graphContext: GraphifyAnalysisContext,
    previousErrors: string[] = []
  ): Promise<GeminiFixProposal> {
    if (!this.apiKey) {
      return this.generateMockProposal(bugReport, graphContext, previousErrors);
    }

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
- Be minimal and precise. Avoid unnecessary rewrites.`;

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

    const fallbackModels = Array.from(
      new Set([
        this.model,
        "gemini-3.6-flash",
        "gemini-3.7-flash",
        "gemini-flash-latest",
        "gemini-flash-lite-latest",
      ])
    );

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

    let lastError = "";
    for (const modelName of fallbackModels) {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey}`;
      try {
        console.log(`Connecting to Gemini API using model: ${modelName}...`);
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          const data = await response.json();
          const candidateText =
            data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
          return this.parseProposalJson(candidateText);
        }

        const errText = await response.text();
        lastError = `Gemini API error (${modelName} - ${response.status}): ${errText}`;
        console.warn(`${lastError}. Trying next model...`);
      } catch (err: any) {
        lastError = `Network error on ${modelName}: ${err.message}`;
        console.warn(`${lastError}. Trying next model...`);
      }
    }

    throw new Error(`All Gemini models failed. Last error: ${lastError}`);
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
   * Mock proposal for testing / offline dry-run when GEMINI_API_KEY is unset
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
