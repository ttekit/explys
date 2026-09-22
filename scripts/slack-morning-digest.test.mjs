import test from "node:test";
import assert from "node:assert/strict";
import {
  getPrPreviewUrl,
  getDaysOpen,
  analyzePrs,
  buildSlackBlocks,
} from "./slack-morning-digest.mjs";

test("getPrPreviewUrl generates correct GitHub Pages preview URLs", () => {
  assert.equal(
    getPrPreviewUrl("ttekit/explys", 160),
    "https://ttekit.github.io/explys/pr-preview/pr-160/"
  );
  assert.equal(
    getPrPreviewUrl("ttekit/explys", 163),
    "https://ttekit.github.io/explys/pr-preview/pr-163/"
  );
  assert.equal(
    getPrPreviewUrl("myorg/myrepo", 42),
    "https://myorg.github.io/myrepo/pr-preview/pr-42/"
  );
});

test("getDaysOpen accurately computes elapsed days", () => {
  const now = new Date("2026-09-22T12:00:00Z");
  const yesterday = "2026-09-21T12:00:00Z";
  const threeDaysAgo = "2026-09-19T12:00:00Z";

  assert.equal(getDaysOpen(now.toISOString(), now), 0);
  assert.equal(getDaysOpen(yesterday, now), 1);
  assert.equal(getDaysOpen(threeDaysAgo, now), 3);
});

test("analyzePrs correctly categorizes PRs and builds GitHub Pages preview links", () => {
  const now = new Date("2026-09-22T12:00:00Z");
  const prs = [
    {
      number: 160,
      title: "Feature/video stars prerequisite",
      isDraft: false,
      createdAt: "2026-09-12T12:00:00Z",
      reviewRequests: [{ login: "leormix" }],
      reviews: [{ state: "COMMENTED" }],
      html_url: "https://github.com/ttekit/explys/pull/160",
    },
    {
      number: 163,
      title: "[DRAFT] feat: add automated Slack morning PR digest",
      isDraft: true,
      createdAt: "2026-09-22T10:00:00Z",
      reviewRequests: [],
      reviews: [],
      html_url: "https://github.com/ttekit/explys/pull/163",
    },
    {
      number: 159,
      title: "fix: resolve readonly type errors",
      isDraft: false,
      createdAt: "2026-09-22T08:00:00Z",
      reviewRequests: [],
      reviews: [{ state: "APPROVED" }],
      html_url: "https://github.com/ttekit/explys/pull/159",
    },
  ];

  const analysis = analyzePrs(prs, { repo: "ttekit/explys", now });

  assert.equal(analysis.activePrs.length, 2);
  assert.equal(analysis.needsReview.length, 1);
  assert.equal(analysis.approved.length, 1);
  assert.equal(analysis.changesRequested.length, 0);

  const stalePr = analysis.needsReview[0];
  assert.equal(stalePr.number, 160);
  assert.equal(stalePr.isStale, true);
  assert.equal(stalePr.daysOpen, 10);
  assert.equal(
    stalePr.previewUrl,
    "https://ttekit.github.io/explys/pr-preview/pr-160/"
  );
});

test("buildSlackBlocks outputs valid Block Kit structure", () => {
  const sampleAnalysis = {
    activePrs: [{ number: 160 }],
    needsReview: [
      {
        number: 160,
        title: "Feature preview",
        url: "https://github.com/ttekit/explys/pull/160",
        daysOpen: 2,
        isStale: true,
        author: { login: "ivan-koltsov" },
        reviewers: ["leormix"],
        previewUrl: "https://ttekit.github.io/explys/pr-preview/pr-160/",
      },
    ],
    approved: [],
    changesRequested: [],
  };

  const payload = buildSlackBlocks(sampleAnalysis);
  assert.ok(Array.isArray(payload.blocks));
  assert.ok(payload.blocks.length >= 5);

  const serialized = JSON.stringify(payload);
  assert.ok(serialized.includes("https://ttekit.github.io/explys/pr-preview/pr-160/"));
  assert.ok(serialized.includes("☀️ Explys Morning PR Digest"));
});
