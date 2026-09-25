import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import { PatchVerifier } from "./patch-verifier";
import { FileChange } from "./types";

describe("PatchVerifier Validation & Safe Application", () => {
  test("rejects modifying non-existent files", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "patch-test-"));
    try {
      const verifier = new PatchVerifier(tmpDir);
      const changes: FileChange[] = [
        {
          path: "non-existent/file.ts",
          action: "modify",
          explanation: "Fix imaginary file",
          originalSnippet: "old code",
          replacementContent: "new code",
        },
      ];

      const { applied, skipped, validationErrors } = verifier.applyChanges(changes, false);
      assert.equal(applied.length, 0);
      assert.equal(skipped.length, 1);
      assert.match(validationErrors[0], /file does not exist in workspace/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("rejects modifying file when originalSnippet does not match", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "patch-test-"));
    try {
      const testFilePath = path.join(tmpDir, "test.ts");
      fs.writeFileSync(testFilePath, "const answer = 42;\nconsole.log(answer);", "utf-8");

      const verifier = new PatchVerifier(tmpDir);
      const changes: FileChange[] = [
        {
          path: "test.ts",
          action: "modify",
          explanation: "Try to replace nonexistent snippet",
          originalSnippet: "const wrongSnippet = 999;",
          replacementContent: "const newSnippet = 100;",
        },
      ];

      const { applied, skipped, validationErrors } = verifier.applyChanges(changes, false);
      assert.equal(applied.length, 0);
      assert.equal(skipped.length, 1);
      assert.match(validationErrors[0], /originalSnippet not found in target file/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("rejects no-op changes where replacement equals original snippet", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "patch-test-"));
    try {
      const testFilePath = path.join(tmpDir, "test.ts");
      fs.writeFileSync(testFilePath, "const answer = 42;", "utf-8");

      const verifier = new PatchVerifier(tmpDir);
      const changes: FileChange[] = [
        {
          path: "test.ts",
          action: "modify",
          explanation: "No-op identical replacement",
          originalSnippet: "const answer = 42;",
          replacementContent: "const answer = 42;",
        },
      ];

      const { applied, skipped, validationErrors } = verifier.applyChanges(changes, false);
      assert.equal(applied.length, 0);
      assert.equal(skipped.length, 1);
      assert.match(validationErrors[0], /replacementContent is identical to originalSnippet/);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("validates snippet match in dryRun mode without writing to disk", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "patch-test-"));
    try {
      const testFilePath = path.join(tmpDir, "test.ts");
      const originalCode = "const answer = 42;\nexport default answer;";
      fs.writeFileSync(testFilePath, originalCode, "utf-8");

      const verifier = new PatchVerifier(tmpDir);
      const changes: FileChange[] = [
        {
          path: "test.ts",
          action: "modify",
          explanation: "Valid patch test",
          originalSnippet: "const answer = 42;",
          replacementContent: "const answer = 100;",
        },
      ];

      const { applied, skipped } = verifier.applyChanges(changes, true);
      assert.equal(applied.length, 1);
      assert.equal(skipped.length, 0);
      assert.equal(applied[0], "test.ts");

      // Verify file was NOT modified in dryRun mode
      assert.equal(fs.readFileSync(testFilePath, "utf-8"), originalCode);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("successfully applies valid patch in real mode", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "patch-test-"));
    try {
      const testFilePath = path.join(tmpDir, "test.ts");
      fs.writeFileSync(testFilePath, "const answer = 42;\nexport default answer;", "utf-8");

      const verifier = new PatchVerifier(tmpDir);
      const changes: FileChange[] = [
        {
          path: "test.ts",
          action: "modify",
          explanation: "Real change application",
          originalSnippet: "const answer = 42;",
          replacementContent: "const answer = 100;",
        },
      ];

      const { applied } = verifier.applyChanges(changes, false);
      assert.equal(applied.length, 1);
      assert.equal(
        fs.readFileSync(testFilePath, "utf-8"),
        "const answer = 100;\nexport default answer;"
      );
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
