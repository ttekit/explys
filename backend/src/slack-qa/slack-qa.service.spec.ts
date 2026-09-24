import { ConfigService } from "@nestjs/config";
import { SlackQaService } from "./slack-qa.service";
import * as crypto from "crypto";

describe("SlackQaService", () => {
  let service: SlackQaService;
  let configService: ConfigService;

  const mockConfigValues: Record<string, string | undefined> = {
    SLACK_SIGNING_SECRET: "test-signing-secret",
    GITHUB_TOKEN: "mock-gh-token",
    GITHUB_OWNER: "ttekit",
    GITHUB_REPO: "explys",
  };

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => mockConfigValues[key]),
    } as unknown as ConfigService;

    service = new SlackQaService(configService);
  });

  describe("verifySlackSignature", () => {
    it("should allow request if SLACK_SIGNING_SECRET is unset", () => {
      jest.spyOn(configService, "get").mockReturnValue(undefined);
      const result = service.verifySlackSignature(undefined, undefined, "raw");
      expect(result).toBe(true);
    });

    it("should reject request if signature or timestamp is missing", () => {
      expect(service.verifySlackSignature(undefined, "12345", "raw")).toBe(false);
      expect(service.verifySlackSignature("v0=sig", undefined, "raw")).toBe(false);
    });

    it("should reject request older than 5 minutes", () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 6+ minutes ago
      const result = service.verifySlackSignature("v0=abc", oldTimestamp.toString(), "raw");
      expect(result).toBe(false);
    });

    it("should accept valid HMAC signature", () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const rawBody = "command=%2Fqa-bug&text=Button+broken";
      const sigBasestring = `v0:${timestamp}:${rawBody}`;
      const validSig =
        "v0=" +
        crypto
          .createHmac("sha256", "test-signing-secret")
          .update(sigBasestring, "utf8")
          .digest("hex");

      const result = service.verifySlackSignature(validSig, timestamp, rawBody);
      expect(result).toBe(true);
    });

    it("should reject invalid HMAC signature", () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const rawBody = "command=%2Fqa-bug&text=Button+broken";
      const invalidSig = "v0=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

      const result = service.verifySlackSignature(invalidSig, timestamp, rawBody);
      expect(result).toBe(false);
    });
  });

  describe("dispatchToGitHub", () => {
    it("should return false if GITHUB_TOKEN is missing", async () => {
      jest.spyOn(configService, "get").mockImplementation((key: string) => {
        if (key === "GITHUB_TOKEN" || key === "GH_TOKEN") return undefined;
        return mockConfigValues[key];
      });

      const result = await service.dispatchToGitHub({
        text: "Fix broken button",
        user_name: "qa-john",
      });

      expect(result).toBe(false);
    });

    it("should dispatch to GitHub API when token is provided", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });
      global.fetch = mockFetch;

      const result = await service.dispatchToGitHub({
        text: "Fix broken button",
        user_name: "qa-john",
        channel_name: "qa-bugs",
        response_url: "https://hooks.slack.com/commands/test",
      });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/ttekit/explys/dispatches",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "token mock-gh-token",
          }),
        })
      );
    });
  });
});
