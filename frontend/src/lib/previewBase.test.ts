import { describe, expect, it } from "vitest";
import { resolvePreviewBase } from "./previewBase";

describe("resolvePreviewBase", () => {
  it("defaults to root / in local development and standard builds", () => {
    expect(resolvePreviewBase({})).toBe("/");
    expect(
      resolvePreviewBase({
        GITHUB_ACTIONS: "false",
        GITHUB_REF: "refs/heads/main",
      })
    ).toBe("/");
  });

  it("resolves correct preview subdirectory for PRs on GitHub Pages", () => {
    const base = resolvePreviewBase({
      GITHUB_ACTIONS: "true",
      GITHUB_REF: "refs/pull/163/merge",
      GITHUB_REPOSITORY: "ttekit/explys",
    });
    expect(base).toBe("/explys/pr-preview/pr-163/");
  });

  it("handles custom repositories", () => {
    const base = resolvePreviewBase({
      GITHUB_ACTIONS: "true",
      GITHUB_REF: "refs/pull/42/head",
      GITHUB_REPOSITORY: "acme/corp-platform",
    });
    expect(base).toBe("/corp-platform/pr-preview/pr-42/");
  });

  it("falls back to explys repository name if GITHUB_REPOSITORY is omitted", () => {
    const base = resolvePreviewBase({
      GITHUB_ACTIONS: "true",
      GITHUB_REF: "refs/pull/99/merge",
    });
    expect(base).toBe("/explys/pr-preview/pr-99/");
  });

  it("ignores non-pull-request GitHub Actions runs", () => {
    const base = resolvePreviewBase({
      GITHUB_ACTIONS: "true",
      GITHUB_REF: "refs/heads/product",
      GITHUB_REPOSITORY: "ttekit/explys",
    });
    expect(base).toBe("/");
  });
});
