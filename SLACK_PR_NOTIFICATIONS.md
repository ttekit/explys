# Official GitHub + Slack Integration Guide for Explys

Since the official **GitHub for Slack** app is already installed in your workspace (`explys.slack.com`), here is the complete step-by-step configuration to enable **Auto Morning Active PR Review Notifications** and real-time team notifications.

All schedules and timezones are set to **Ukraine / Kyiv Time (`Europe/Kyiv`)**.

---

## 1. Auto Morning PR Review Notifications (Scheduled Reminders)

GitHub provides a native, zero-maintenance **Scheduled Reminders** feature specifically designed for daily morning review digests into Slack channels.

### Step 1: Open GitHub Organization Reminders
Navigate directly to:
👉 **[https://github.com/organizations/ttekit/settings/reminders](https://github.com/organizations/ttekit/settings/reminders)**
*(Note: Requires GitHub Org Owner or Admin access for `ttekit`)*

### Step 2: Add a Channel Reminder
Click **"Add reminder"** and configure:

1. **Slack Workspace**: Select `Explys` (authenticated via the installed GitHub app).
2. **Channel**: Select your target channel (e.g. `#dev`, `#reviews`, `#engineering`).
3. **Days**: Select `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`.
4. **Time**: Set to **`09:30`** or **`10:00`**.
5. **Time zone**: Select **`Europe/Kyiv`** (or `(GMT+02:00 / +03:00) Kyiv`).
6. **PR Filter Settings**:
   - ✅ **Ignore drafts**: Checked (prevents WIP PRs from cluttering morning standup).
   - ✅ **Require review**: Checked.
   - ✅ **Remind about reviews awaiting reviewer approval**: Checked.
   - ⏱️ **Minimum age**: `0` or `1` hour.
   - 👥 **Assigned reviewers**: Checked (mentions assigned Slack team members if their GitHub accounts are linked).

Click **Create reminder**.

---

## 2. Channel Slash Command Configuration (`/github`)

To enable real-time PR review updates and test the integration directly inside your Slack channel:

### Step 1: Invite GitHub Bot to the Channel
In your Slack channel (e.g. `#reviews`), run:
```slack
/invite @github
```

### Step 2: Connect Repository & Subscribe to Reviews
Run the following command to subscribe the channel to Pull Requests and review updates:
```slack
/github subscribe ttekit/explys pulls,reviews
```

### Useful Commands for Tuning:
| Command | Action |
| :--- | :--- |
| `/github subscribe list` | Show all active subscriptions for the current channel |
| `/github subscribe ttekit/explys reviews` | Subscribe strictly to review submissions and requests |
| `/github unsubscribe ttekit/explys issues` | Turn off general issue notifications if noisy |
| `/github signin` | Link your personal Slack user with your GitHub account |

---

## 3. Individual Developer Morning Reminders (Personal DMs)

In addition to the public channel digest, each developer on the team can receive personal daily morning review reminders in Slack DM:

1. Go to: **[https://github.com/settings/reminders](https://github.com/settings/reminders)**
2. Under **Slack**:
   - Check **"Enable scheduled reminders"**.
   - Time: **`09:30`** AM.
   - Timezone: **`Europe/Kyiv`**.
   - Select **"PRs assigned to you or waiting for your review"**.
3. GitHub will send a concise Slack DM every morning summarizing exactly which PRs need that developer's review.

---

## 4. Comparing Scheduled Reminders vs. Custom Repo Digest

| Feature | GitHub App Scheduled Reminders | Custom In-Repo Workflow (`slack-morning-digest.mjs`) |
| :--- | :--- | :--- |
| **Setup** | 1-click in GitHub Settings UI | Uses `SLACK_WEBHOOK_URL` in repo Actions |
| **Schedule** | Daily morning (Kyiv Time) | Daily morning Mon–Fri (Kyiv Time) |
| **Interactive Buttons** | Native GitHub Slack UI | Block Kit "Review PR" buttons |
| **PR Previews** | Links to github.com PR | Includes direct live `preview.explys.dev` link |
| **Slack User Mentions** | Auto-maps GitHub to Slack users | Displays `@github-username` |

> **Recommendation**: Enable **Scheduled Reminders** in `github.com/organizations/ttekit/settings/reminders` for standard daily Slack notifications. Keep the repo's [`.github/workflows/slack-morning-pr-digest.yml`](file:///Users/ivankoltsov/Workspaces/explys/.github/workflows/slack-morning-pr-digest.yml) available if your team wants live deployment preview URLs embedded in the morning digest.
