import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { SlackQaController } from "./slack-qa.controller";
import { SlackQaService } from "./slack-qa.service";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";

describe("SlackQaController", () => {
  let controller: SlackQaController;
  let service: SlackQaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SlackQaController],
      providers: [
        {
          provide: SlackQaService,
          useValue: {
            verifySlackSignature: jest.fn(),
            dispatchToGitHub: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<SlackQaController>(SlackQaController);
    service = module.get<SlackQaService>(SlackQaService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should throw UnauthorizedException if signature verification fails", async () => {
    jest.spyOn(service, "verifySlackSignature").mockReturnValue(false);

    const mockReq = {
      rawBody: Buffer.from("test-body"),
    } as unknown as RawBodyRequest<Request>;

    await expect(
      controller.handleQaBug(
        { text: "Test bug" },
        "invalid-sig",
        "1234567890",
        mockReq
      )
    ).rejects.toThrow(UnauthorizedException);
  });

  it("should return ephemeral message if bug text is empty", async () => {
    jest.spyOn(service, "verifySlackSignature").mockReturnValue(true);

    const mockReq = {
      rawBody: Buffer.from(""),
    } as unknown as RawBodyRequest<Request>;

    const response = await controller.handleQaBug(
      { text: "   " },
      "valid-sig",
      "1234567890",
      mockReq
    );

    expect(response).toEqual({
      response_type: "ephemeral",
      text: expect.stringContaining("Please provide a bug description"),
    });
  });

  it("should trigger async dispatch and return in_channel acknowledgment", async () => {
    jest.spyOn(service, "verifySlackSignature").mockReturnValue(true);

    const mockReq = {
      rawBody: Buffer.from("text=Hero+stats+offset"),
    } as unknown as RawBodyRequest<Request>;

    const response = await controller.handleQaBug(
      { text: "Hero stats offset", user_name: "qa-john", channel_name: "qa-bugs" },
      "valid-sig",
      "1234567890",
      mockReq
    );

    expect(service.dispatchToGitHub).toHaveBeenCalledWith({
      text: "Hero stats offset",
      user_name: "qa-john",
      channel_name: "qa-bugs",
    });

    expect(response).toEqual({
      response_type: "in_channel",
      text: expect.stringContaining("Explys Gemini QA Agent has picked up your bug report"),
    });
  });
});
