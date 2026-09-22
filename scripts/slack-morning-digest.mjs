#!/usr/bin/env node

/**
 * Explys Morning PR Digest for Slack
 * 
 * Fetches active pull requests needing review and posts an interactive
 * Block Kit summary to Slack via an Incoming Webhook.
 * Timezone: Europe/Kyiv (Ukraine).
 */

import { execSync } from "node:child_process";

const GITHUB_REPO = process.env.GITHUB_REPOSITORY || "ttekit/explys";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || "";
const IS_DRY_RUN = process.argv.includes("--dry-run") || !SLACK_WEBHOOK_URL;

/**
 * Formats current date and time in Kyiv time
 */
function getKyivDateString() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Kyiv",
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/**
 * Formats PR preview environment URL hosted on GitHub Pages
 */
export function getPrPreviewUrl(repo, prNumber) {
  const [owner, repoName] = (repo || "ttekit/explys").split("/");
  return `https://${owner}.github.io/${repoName}/pr-preview/pr-${prNumber}/`;
}

/**
 * Calculates days elapsed since PR creation
 */
export function getDaysOpen(createdAt, now = new Date()) {
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
}

/**
 * Fetches open pull requests using `gh` CLI or fallback to GitHub REST API
 */
export async function fetchOpenPrs() {
  // 1. Try gh CLI if available
  try {
    const stdout = execSync(
      `gh pr list --repo "${GITHUB_REPO}" --state open --json number,title,author,url,createdAt,updatedAt,isDraft,reviewRequests,reviews,headRefName`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "ignore"] }
    );
    return JSON.parse(stdout);
  } catch {
    // 2. Fallback to GitHub REST API via fetch
    console.log("GitHub CLI not available or errored, falling back to REST API...");
    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "explys-morning-pr-digest",
    };
    if (GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
    }

    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/pulls?state=open&per_page=50`, {
      headers,
    });

    if (!res.ok) {
      throw new Error(`GitHub API returned ${res.status}: ${await res.text()}`);
    }

    const pulls = await res.json();
    return pulls.map((p) => {
      const isDraft = Boolean(p.draft) || /^\s*(\[draft\]|draft:|wip:)/i.test(p.title);
      return {
        number: p.number,
        title: p.title,
        author: { login: p.user?.login || "unknown" },
        url: p.html_url,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        isDraft,
        reviewRequests: (p.requested_reviewers || []).map((r) => ({ login: r.login })),
        reviews: [],
        headRefName: p.head?.ref || "",
      };
    });
  }
}

/**
 * Categorizes PRs into Needs Review, Approved, and Stale
 */
export function analyzePrs(prs, options = {}) {
  const repo = options.repo || GITHUB_REPO;
  const now = options.now || new Date();
  const activePrs = prs.filter((p) => !p.isDraft);

  const needsReview = [];
  const approved = [];
  const changesRequested = [];

  for (const pr of activePrs) {
    const days = getDaysOpen(pr.createdAt, now);
    const reviewers = (pr.reviewRequests || []).map((r) => r.login).filter(Boolean);
    const previewUrl = getPrPreviewUrl(repo, pr.number);

    // Check review states
    const reviewStates = (pr.reviews || []).map((r) => r.state);
    const isApproved = reviewStates.includes("APPROVED");
    const hasChangesRequested = reviewStates.includes("CHANGES_REQUESTED");

    const item = {
      ...pr,
      daysOpen: days,
      reviewers,
      previewUrl,
      isStale: days >= 2,
    };

    if (hasChangesRequested) {
      changesRequested.push(item);
    } else if (isApproved) {
      approved.push(item);
    } else {
      needsReview.push(item);
    }
  }

  return { activePrs, needsReview, approved, changesRequested };
}

/**
 * Builds Slack Block Kit message
 */
export function buildSlackBlocks({ activePrs, needsReview, approved, changesRequested }) {
  const kyivTime = getKyivDateString();

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "☀️ Explys Morning PR Digest",
        emoji: true,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `📅 *${kyivTime} (Kyiv Time)*  •  Repository: *<https://github.com/${GITHUB_REPO}|${GITHUB_REPO}>*`,
        },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Active Pull Requests:* ${activePrs.length} total | 🟡 *${needsReview.length}* waiting for review | 🟢 *${approved.length}* approved | 🟠 *${changesRequested.length}* changes requested`,
      },
    },
    { type: "divider" },
  ];

  // If no PRs require review
  if (needsReview.length === 0 && changesRequested.length === 0 && approved.length === 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "🎉 *Inbox Zero!* No open pull requests waiting for review today. Great job team!",
      },
    });
    return { blocks };
  }

  // 1. PRs waiting for review
  if (needsReview.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*🟡 Waiting for Review:*",
      },
    });

    for (const pr of needsReview) {
      const staleBadge = pr.isStale ? `⚠️ *Stale (${pr.daysOpen}d)*` : `⏱️ ${pr.daysOpen}d ago`;
      const reviewersText = pr.reviewers.length > 0
        ? `Reviewers: ${pr.reviewers.map((r) => `\`@${r}\``).join(", ")}`
        : "_No reviewer assigned_";

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `• *<${pr.url}|#${pr.number} — ${escapeMrkdwn(pr.title)}>* (${staleBadge})\n  Author: \`@${pr.author?.login}\`  |  ${reviewersText}\n  🌐 <${pr.previewUrl}|Preview Deployment>`,
        },
        accessory: {
          type: "button",
          text: {
            type: "plain_text",
            text: "Review PR",
            emoji: true,
          },
          url: pr.url,
          action_id: `review_pr_${pr.number}`,
        },
      });
    }
  }

  // 2. Changes requested
  if (changesRequested.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*🟠 Changes Requested / Addressing Feedback:*",
      },
    });

    for (const pr of changesRequested) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `• *<${pr.url}|#${pr.number} — ${escapeMrkdwn(pr.title)}>* (by \`@${pr.author?.login}\`)\n  🌐 <${pr.previewUrl}|Preview Deployment>`,
        },
      });
    }
  }

  // 3. Approved & Ready to Merge
  if (approved.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*🟢 Approved & Ready to Merge:*",
      },
    });

    for (const pr of approved) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `• *<${pr.url}|#${pr.number} — ${escapeMrkdwn(pr.title)}>* (by \`@${pr.author?.login}\`)\n  🌐 <${pr.previewUrl}|Preview Deployment>`,
        },
      });
    }
  }

  blocks.push({ type: "divider" });
  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: "💡 _Tip: Review PRs promptly to keep deploy previews and delivery cycles moving quickly._",
      },
    ],
  });

  return { blocks };
}

function escapeMrkdwn(text) {
  return (text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function main() {
  console.log("🔍 Fetching active pull requests...");
  const prs = await fetchOpenPrs();
  console.log(`Found ${prs.length} open PR(s).`);

  const analysis = analyzePrs(prs);
  console.log(
    `Analysis: ${analysis.needsReview.length} needs review, ${analysis.approved.length} approved, ${analysis.changesRequested.length} changes requested.`
  );

  const payload = buildSlackBlocks(analysis);

  if (IS_DRY_RUN) {
    console.log("\n[DRY RUN] SLACK_WEBHOOK_URL not set or --dry-run specified.");
    console.log("Rendered Slack Payload:\n", JSON.stringify(payload, null, 2));
    return;
  }

  console.log("🚀 Posting morning digest to Slack webhook...");
  const res = await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to post to Slack: ${res.status} ${await res.text()}`);
  }

  console.log("✅ Morning PR digest successfully posted to Slack.");
}

const isDirectExecution =
  process.argv[1] &&
  (import.meta.url === `file://${process.argv[1]}` ||
    import.meta.url.endsWith(process.argv[1].replace(/.*[/\\]/, "")));

if (isDirectExecution) {
  main().catch((err) => {
    console.error("❌ Error running morning PR digest:", err);
    process.exit(1);
  });
}
