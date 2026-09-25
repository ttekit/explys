import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { JiraClient } from "./jira-client";

describe("JiraClient — Issue Parsing, ADF Parsing, and REST Integration", () => {
  const client = new JiraClient("https://ttekit.atlassian.net", "test@explys.com", "mock-token");

  describe("parseIssueInput", () => {
    test("extracts issue key and host from Jira board URL", () => {
      const url =
        "https://ttekit.atlassian.net/jira/software/projects/ET1/boards/69?filter=&groupBy=none&selectedIssue=ET1-3";
      const result = client.parseIssueInput(url);
      assert.deepEqual(result, {
        host: "https://ttekit.atlassian.net",
        issueKey: "ET1-3",
      });
    });

    test("extracts issue key and host from /browse/ URL", () => {
      const url = "https://custom-jira.company.com/browse/PROJ-1234";
      const result = client.parseIssueInput(url);
      assert.deepEqual(result, {
        host: "https://custom-jira.company.com",
        issueKey: "PROJ-1234",
      });
    });

    test("extracts issue key from standalone issue key string", () => {
      const result = client.parseIssueInput("ET1-42");
      assert.deepEqual(result, {
        host: "https://ttekit.atlassian.net",
        issueKey: "ET1-42",
      });
    });

    test("extracts issue key embedded in natural language bug report", () => {
      const result = client.parseIssueInput("Please fix ET1-99 where video pause is broken");
      assert.deepEqual(result, {
        host: "https://ttekit.atlassian.net",
        issueKey: "ET1-99",
      });
    });

    test("returns null when no valid Jira key pattern is present", () => {
      assert.equal(client.parseIssueInput("Just a normal message without keys"), null);
      assert.equal(client.parseIssueInput(""), null);
    });
  });

  describe("adfToText", () => {
    test("handles plain string text", () => {
      assert.equal(client.adfToText("Direct text description"), "Direct text description");
    });

    test("converts Atlassian ADF paragraph and heading nodes", () => {
      const adf = {
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Bug Title" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: "Steps to reproduce this error." }],
          },
        ],
      };

      const text = client.adfToText(adf);
      assert.match(text, /## Bug Title/);
      assert.match(text, /Steps to reproduce this error\./);
    });

    test("converts ADF bullet list and code blocks", () => {
      const adf = {
        type: "doc",
        content: [
          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [{ type: "paragraph", content: [{ type: "text", text: "Item 1" }] }],
              },
            ],
          },
          {
            type: "codeBlock",
            attrs: { language: "typescript" },
            content: [{ type: "text", text: "console.log('error');" }],
          },
        ],
      };

      const text = client.adfToText(adf);
      assert.match(text, /• Item 1/);
      assert.match(text, /```typescript\nconsole\.log\('error'\);\n```/);
    });
  });

  describe("isConfigured", () => {
    test("returns true when email and apiToken are provided", () => {
      const configured = new JiraClient("https://jira.com", "user@test.com", "token123");
      assert.equal(configured.isConfigured(), true);
    });

    test("returns false when credentials are empty", () => {
      const unconfigured = new JiraClient("https://jira.com", "", "");
      assert.equal(unconfigured.isConfigured(), false);
    });
  });

  describe("getIssue & addComment API mock integration", () => {
    test("throws meaningful error if getIssue is called without credentials", async () => {
      const unconfigured = new JiraClient("https://jira.com", "", "");
      await assert.rejects(
        () => unconfigured.getIssue("ET1-3"),
        /Jira API credentials not configured/
      );
    });

    test("adds comment via Jira REST API v2", async () => {
      const originalFetch = globalThis.fetch;
      try {
        let sentBody = "";
        let sentAuth = "";
        globalThis.fetch = (async (url: any, init: any) => {
          sentBody = init.body;
          sentAuth = init.headers.Authorization;
          return {
            ok: true,
            status: 201,
            json: async () => ({ id: "10001" }),
            text: async () => "",
          } as any;
        }) as any;

        const jira = new JiraClient("https://ttekit.atlassian.net", "bot@explys.com", "secret-pass");
        const success = await jira.addComment("ET1-3", "PR https://github.com/ttekit/explys/pull/99");

        assert.equal(success, true);
        assert.match(sentBody, /PR https:\/\/github\.com\/ttekit\/explys\/pull\/99/);
        assert.match(sentAuth, /^Basic /);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    test("parses issue response from getIssue", async () => {
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = (async () => {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              key: "ET1-3",
              fields: {
                summary: "Hero stats magic number",
                description: {
                  type: "doc",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Offset is +3259 instead of dynamic" }],
                    },
                  ],
                },
                reporter: { displayName: "Ivan Koltsov" },
                status: { name: "To Do" },
                issuetype: { name: "Bug" },
              },
            }),
            text: async () => "",
          } as any;
        }) as any;

        const jira = new JiraClient("https://ttekit.atlassian.net", "bot@explys.com", "secret-pass");
        const issue = await jira.getIssue("ET1-3");

        assert.equal(issue.key, "ET1-3");
        assert.equal(issue.summary, "Hero stats magic number");
        assert.match(issue.description, /Offset is \+3259/);
        assert.equal(issue.reporter, "Ivan Koltsov");
        assert.equal(issue.url, "https://ttekit.atlassian.net/browse/ET1-3");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});
