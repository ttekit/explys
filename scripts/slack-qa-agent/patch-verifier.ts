import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { FileChange, VerificationResult } from "./types";

export class PatchVerifier {
  private workspaceRoot: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Safely applies file modifications proposed by Gemini
   */
  public applyChanges(changes: FileChange[], dryRun: boolean = false): {
    applied: string[];
    skipped: string[];
  } {
    const applied: string[] = [];
    const skipped: string[] = [];

    for (const change of changes) {
      const fullPath = path.join(this.workspaceRoot, change.path);

      if (dryRun) {
        console.log(`[DRY RUN] Would ${change.action} file: ${change.path}`);
        applied.push(change.path);
        continue;
      }

      if (change.action === "create") {
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
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          applied.push(change.path);
        } else {
          skipped.push(change.path);
        }
        continue;
      }

      if (change.action === "modify") {
        if (!fs.existsSync(fullPath)) {
          console.warn(`File not found to modify: ${change.path}`);
          skipped.push(change.path);
          continue;
        }

        const originalFileContent = fs.readFileSync(fullPath, "utf-8");
        const snippet = change.originalSnippet;
        const replacement = change.replacementContent ?? "";

        if (snippet && originalFileContent.includes(snippet)) {
          const updated = originalFileContent.replace(snippet, replacement);
          fs.writeFileSync(fullPath, updated, "utf-8");
          applied.push(change.path);
        } else if (change.newContent) {
          // If full newContent is provided
          fs.writeFileSync(fullPath, change.newContent, "utf-8");
          applied.push(change.path);
        } else if (snippet) {
          // Try normalized whitespace matching
          const normalizedOriginal = originalFileContent.replace(/\r\n/g, "\n");
          const normalizedSnippet = snippet.replace(/\r\n/g, "\n");
          if (normalizedOriginal.includes(normalizedSnippet)) {
            const updated = normalizedOriginal.replace(
              normalizedSnippet,
              replacement.replace(/\r\n/g, "\n")
            );
            fs.writeFileSync(fullPath, updated, "utf-8");
            applied.push(change.path);
          } else {
            console.warn(`Could not match originalSnippet in ${change.path}`);
            skipped.push(change.path);
          }
        } else {
          skipped.push(change.path);
        }
      }
    }

    return { applied, skipped };
  }

  /**
   * Run verification commands according to touched directories
   */
  public runVerification(touchedFiles: string[]): VerificationResult {
    let typeCheckPassed = true;
    let testsPassed = true;
    const errors: string[] = [];
    const logs: string[] = [];

    const touchesFrontend = touchedFiles.some((f) => f.startsWith("frontend/"));
    const touchesBackend = touchedFiles.some((f) => f.startsWith("backend/"));
    const touchesMobile = touchedFiles.some((f) => f.startsWith("mobile/"));

    if (touchesFrontend) {
      try {
        console.log("Running frontend type-check...");
        const out = execSync("npm run type-check", {
          cwd: path.join(this.workspaceRoot, "frontend"),
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
        });
        logs.push(`[Frontend Type Check] OK\n${out.slice(0, 500)}`);
      } catch (err: any) {
        typeCheckPassed = false;
        const errMsg = err.stderr || err.stdout || err.message;
        errors.push(`Frontend type-check failed: ${errMsg.slice(0, 1000)}`);
      }
    }

    if (touchesBackend) {
      try {
        console.log("Running backend tests & check...");
        const out = execSync("npm run test:ci", {
          cwd: path.join(this.workspaceRoot, "backend"),
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
        });
        logs.push(`[Backend Tests] OK\n${out.slice(0, 500)}`);
      } catch (err: any) {
        testsPassed = false;
        const errMsg = err.stderr || err.stdout || err.message;
        errors.push(`Backend tests failed: ${errMsg.slice(0, 1000)}`);
      }
    }

    if (touchesMobile) {
      try {
        console.log("Running mobile type-check...");
        const out = execSync("npm run type-check", {
          cwd: path.join(this.workspaceRoot, "mobile"),
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
        });
        logs.push(`[Mobile Type Check] OK\n${out.slice(0, 500)}`);
      } catch (err: any) {
        typeCheckPassed = false;
        const errMsg = err.stderr || err.stdout || err.message;
        errors.push(`Mobile type-check failed: ${errMsg.slice(0, 1000)}`);
      }
    }

    const success = typeCheckPassed && testsPassed;

    return {
      success,
      typeCheckPassed,
      testsPassed,
      summary: success
        ? "All touched subprojects passed quality gates."
        : `Verification failed (${errors.length} errors).`,
      errors,
      output: logs.join("\n"),
    };
  }

  /**
   * Updates local graphify knowledge graph at zero token cost
   */
  public updateGraphify(): void {
    try {
      console.log("Updating Graphify knowledge graph (local AST)...");
      execSync("graphify update .", {
        cwd: this.workspaceRoot,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      console.log("Graphify knowledge graph updated.");
    } catch {
      console.warn("Could not run 'graphify update .'. Ensure graphify is installed locally.");
    }
  }
}
