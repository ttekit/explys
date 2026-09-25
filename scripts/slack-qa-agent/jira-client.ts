import { resolveApiKey } from "./gemini-fixer";

export interface JiraIssueDetails {
  key: string;
  summary: string;
  description: string;
  reporter: string;
  status: string;
  issueType: string;
  url: string;
}

export class JiraClient {
  private defaultHost: string;
  private email: string;
  private apiToken: string;

  constructor(host?: string, email?: string, apiToken?: string) {
    this.defaultHost = (
      host ||
      resolveApiKey("JIRA_HOST") ||
      "https://ttekit.atlassian.net"
    ).replace(/\/+$/, "");
    this.email = email || resolveApiKey("JIRA_EMAIL") || "";
    this.apiToken = apiToken || resolveApiKey("JIRA_API_TOKEN") || "";
  }

  public isConfigured(): boolean {
    return Boolean(this.email && this.apiToken);
  }

  /**
   * Extracts Jira issue key (e.g. 'ET1-3') and host from a URL or key string
   */
  public parseIssueInput(input: string): { host: string; issueKey: string } | null {
    const trimmed = input.trim();

    // 1. Check for selectedIssue query param (e.g. /boards/69?...&selectedIssue=ET1-3)
    const selectedMatch = trimmed.match(/selectedIssue=([A-Z0-9]+-\d+)/i);
    if (selectedMatch) {
      const hostMatch = trimmed.match(/^(https?:\/\/[^/?#]+)/i);
      return {
        host: hostMatch ? hostMatch[1] : this.defaultHost,
        issueKey: selectedMatch[1].toUpperCase(),
      };
    }

    // 2. Check for /browse/ET1-3
    const browseMatch = trimmed.match(/browse\/([A-Z0-9]+-\d+)/i);
    if (browseMatch) {
      const hostMatch = trimmed.match(/^(https?:\/\/[^/?#]+)/i);
      return {
        host: hostMatch ? hostMatch[1] : this.defaultHost,
        issueKey: browseMatch[1].toUpperCase(),
      };
    }

    // 3. Check for standalone issue key (e.g. 'ET1-3')
    const keyMatch = trimmed.match(/\b([A-Z0-9]+-\d+)\b/i);
    if (keyMatch) {
      return {
        host: this.defaultHost,
        issueKey: keyMatch[1].toUpperCase(),
      };
    }

    return null;
  }

  private getAuthHeader(): string {
    const creds = `${this.email}:${this.apiToken}`;
    return `Basic ${Buffer.from(creds).toString("base64")}`;
  }

  /**
   * Converts Atlassian Document Format (ADF) into readable text
   */
  public adfToText(node: any): string {
    if (!node) return "";
    if (typeof node === "string") return node;

    if (node.type === "text") {
      return node.text || "";
    }

    const childText = Array.isArray(node.content)
      ? node.content.map((child: any) => this.adfToText(child)).join("")
      : "";

    switch (node.type) {
      case "paragraph":
        return `${childText}\n\n`;
      case "heading":
        return `\n${"#".repeat(node.attrs?.level || 2)} ${childText}\n\n`;
      case "bulletList":
      case "orderedList":
        return `${childText}\n`;
      case "listItem":
        return `• ${childText.trim()}\n`;
      case "codeBlock":
        return `\`\`\`${node.attrs?.language || ""}\n${childText}\n\`\`\`\n\n`;
      case "blockquote":
        return `> ${childText.trim()}\n\n`;
      default:
        return childText;
    }
  }

  /**
   * Fetches issue details from Jira REST API
   */
  public async getIssue(issueKeyOrUrl: string): Promise<JiraIssueDetails> {
    const parsed = this.parseIssueInput(issueKeyOrUrl);
    if (!parsed) {
      throw new Error(`Could not parse Jira issue key from input: "${issueKeyOrUrl}"`);
    }

    const { host, issueKey } = parsed;
    const url = `${host}/rest/api/3/issue/${issueKey}`;

    if (!this.isConfigured()) {
      throw new Error(
        `Jira API credentials not configured.\nPlease set JIRA_EMAIL and JIRA_API_TOKEN in backend/.env or environment variables.\nGet an API token at: https://id.atlassian.com/manage-profile/security/api-tokens`
      );
    }

    console.log(`Connecting to Jira (${host}) for issue ${issueKey}...`);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: this.getAuthHeader(),
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Jira API error (${res.status} ${res.statusText}): ${errText}`);
    }

    const data: any = await res.json();
    const fields = data.fields || {};

    let descriptionText = "";
    if (typeof fields.description === "string") {
      descriptionText = fields.description;
    } else if (fields.description) {
      descriptionText = this.adfToText(fields.description).trim();
    }

    return {
      key: data.key || issueKey,
      summary: fields.summary || "",
      description: descriptionText,
      reporter: fields.reporter?.displayName || fields.reporter?.emailAddress || "jira-user",
      status: fields.status?.name || "Open",
      issueType: fields.issuetype?.name || "Bug",
      url: `${host}/browse/${issueKey}`,
    };
  }

  /**
   * Adds a comment to a Jira issue linking to the created PR and Preview URL
   */
  public async addComment(
    issueKeyOrUrl: string,
    commentText: string
  ): Promise<boolean> {
    const parsed = this.parseIssueInput(issueKeyOrUrl);
    if (!parsed || !this.isConfigured()) return false;

    const { host, issueKey } = parsed;
    // Using v2 comments endpoint which accepts plain string body
    const url = `${host}/rest/api/2/issue/${issueKey}/comment`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: this.getAuthHeader(),
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          body: commentText,
        }),
      });

      if (!res.ok) {
        console.warn(`Could not post Jira comment (${res.status}): ${await res.text()}`);
        return false;
      }

      console.log(`✅ Attached PR comment to Jira issue ${issueKey}.`);
      return true;
    } catch (err: any) {
      console.warn("Failed to add Jira comment:", err.message);
      return false;
    }
  }
}
