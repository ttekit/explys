import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { FileChange, VerificationResult } from "./types";

export interface ApplyChangesResult {
  applied: string[];
  skipped: string[];
  validationErrors: string[];
}

export class PatchVerifier {
  private workspaceRoot: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Validates and safely applies file modifications proposed by AI
   */
  public applyChanges(
    changes: FileChange[],
    dryRun: boolean = false
  ): ApplyChangesResult {
    const applied: string[] = [];
    const skipped: string[] = [];
    const validationErrors: string[] = [];

    for (const change of changes) {
      if (!change.path || typeof change.path !== "string") {
        validationErrors.push("Change missing valid 'path'");
        continue;
      }

      // Sanitize path against directory traversal
      const sanitized = path
        .normalize(change.path)
        .replace(/^(\.\.(\/|\\|$))+/, "");
      const fullPath = path.join(this.workspaceRoot, sanitized);

      if (change.action === "create") {
        if (!change.newContent && !change.replacementContent) {
          const err = `Cannot create '${change.path}': empty content provided`;
          validationErrors.push(err);
          skipped.push(change.path);
          continue;
        }

        if (dryRun) {
          console.log(`[DRY RUN] ✅ Validated file creation: ${change.path}`);
          applied.push(change.path);
          continue;
        }

        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(
          fullPath,
          change.newContent || change.replacementContent || "",
          "utf-8"
        );
        applied.push(change.path);
        continue;
      }

      if (change.action === "delete") {
        if (!fs.existsSync(fullPath)) {
          const err = `Cannot delete '${change.path}': file does not exist on disk`;
          console.warn(`[Validation] ❌ ${err}`);
          validationErrors.push(err);
          skipped.push(change.path);
          continue;
        }

        if (dryRun) {
          console.log(`[DRY RUN] ✅ Validated file deletion: ${change.path}`);
          applied.push(change.path);
          continue;
        }

        fs.unlinkSync(fullPath);
        applied.push(change.path);
        continue;
      }

      if (change.action === "modify") {
        if (!fs.existsSync(fullPath)) {
          const err = `Cannot modify '${change.path}': file does not exist in workspace`;
          console.warn(`[Validation] ❌ ${err}`);
          validationErrors.push(err);
          skipped.push(change.path);
          continue;
        }

        const originalFileContent = fs.readFileSync(fullPath, "utf-8");
        const snippet = change.originalSnippet;
        const replacement = change.replacementContent ?? "";

        let matched = false;
        let updatedContent = "";

        if (snippet && originalFileContent.includes(snippet)) {
          matched = true;
          updatedContent = originalFileContent.replace(snippet, replacement);
        } else if (change.newContent) {
          matched = true;
          updatedContent = change.newContent;
        } else if (snippet) {
          // Normalize line endings and whitespace
          const normalizedOriginal = originalFileContent.replace(/\r\n/g, "\n");
          const normalizedSnippet = snippet.replace(/\r\n/g, "\n");
          if (normalizedOriginal.includes(normalizedSnippet)) {
            matched = true;
            updatedContent = normalizedOriginal.replace(
              normalizedSnippet,
              replacement.replace(/\r\n/g, "\n")
            );
          }
        }

        if (!matched) {
          const err = `Cannot modify '${change.path}': originalSnippet not found in target file content`;
          console.warn(`[Validation] ❌ ${err}`);
          validationErrors.push(err);
          skipped.push(change.path);
          continue;
        }

        if (snippet && snippet === replacement) {
          const err = `Cannot modify '${change.path}': replacementContent is identical to originalSnippet (no-op)`;
          console.warn(`[Validation] ❌ ${err}`);
          validationErrors.push(err);
          skipped.push(change.path);
          continue;
        }

        if (dryRun) {
          console.log(
            `[DRY RUN] ✅ Validated file snippet match: ${change.path} (${snippet ? snippet.length : 0} chars)`
          );
          applied.push(change.path);
          continue;
        }

        fs.writeFileSync(fullPath, updatedContent, "utf-8");
        applied.push(change.path);
      }
    }

    return { applied, skipped, validationErrors };
  }

  /**
   * Run verification commands according to touched directories
   */
  public runVerification(touchedFiles: string[]): VerificationResult {
    let typeCheckPassed = true;
    let testsPassed = true;
    const errors: string[] = [];
    const outputLogs: string[] = [];

    const touchesFrontend = touchedFiles.some((f) => f.startsWith("frontend/"));
    const touchesBackend = touchedFiles.some((f) => f.startsWith("backend/"));
    const touchesMobile = touchedFiles.some((f) => f.startsWith("mobile/"));
    const touchesScripts = touchedFiles.some((f) => f.startsWith("scripts/"));

    // 1. Frontend Checks
    if (touchesFrontend) {
      console.log("-> Running Frontend Type-Check & Unit Tests...");
      try {
        const typeOut = execSync("npm run type-check", {
          cwd: path.join(this.workspaceRoot, "frontend"),
          encoding: "utf-8",
        });
        outputLogs.push(typeOut);
      } catch (err: any) {
        typeCheckPassed = false;
        errors.push(`Frontend Type Check Failed:\n${err.stdout || err.message}`);
      }

      try {
        const testOut = execSync("npm test -- --run", {
          cwd: path.join(this.workspaceRoot, "frontend"),
          encoding: "utf-8",
        });
        outputLogs.push(testOut);
      } catch (err: any) {
        testsPassed = false;
        errors.push(`Frontend Vitest Tests Failed:\n${err.stdout || err.message}`);
      }
    }

    // 2. Backend Checks
    if (touchesBackend) {
      console.log("-> Running Backend Unit Tests (Jest)...");
      try {
        const testOut = execSync("npm run test", {
          cwd: path.join(this.workspaceRoot, "backend"),
          encoding: "utf-8",
        });
        outputLogs.push(testOut);
      } catch (err: any) {
        testsPassed = false;
        errors.push(`Backend Jest Tests Failed:\n${err.stdout || err.message}`);
      }
    }

    // 3. Mobile Checks
    if (touchesMobile) {
      console.log("-> Running Mobile Type-Check...");
      try {
        const typeOut = execSync("npm run type-check", {
          cwd: path.join(this.workspaceRoot, "mobile"),
          encoding: "utf-8",
        });
        outputLogs.push(typeOut);
      } catch (err: any) {
        typeCheckPassed = false;
        errors.push(`Mobile Type Check Failed:\n${err.stdout || err.message}`);
      }
    }

    // 4. Scripts Checks
    if (touchesScripts) {
      console.log("-> Running Scripts TypeScript Check...");
      try {
        const typeOut = execSync(
          "./backend/node_modules/.bin/tsc --project scripts/tsconfig.json --noEmit",
          {
            cwd: this.workspaceRoot,
            encoding: "utf-8",
          }
        );
        outputLogs.push(typeOut);
      } catch (err: any) {
        typeCheckPassed = false;
        errors.push(`Scripts Type Check Failed:\n${err.stdout || err.message}`);
      }
    }

    const success = typeCheckPassed && testsPassed;
    const summary = success
      ? "All touched subsystem quality gates passed."
      : `Quality gates failed: ${typeCheckPassed ? "" : "TypeCheck failed. "}${testsPassed ? "" : "Tests failed."}`;

    return {
      success,
      typeCheckPassed,
      testsPassed,
      summary,
      errors,
      output: outputLogs.join("\n"),
    };
  }

  /**
   * Syncs the local Graphify Knowledge Graph after code modification
   */
  public updateGraphify(): void {
    try {
      execSync("graphify update .", {
        cwd: this.workspaceRoot,
        encoding: "utf-8",
      });
      console.log("-> Graphify knowledge graph synchronized (0 token cost).");
    } catch (err: any) {
      console.warn("Could not update Graphify AST graph:", err.message);
    }
  }
}
