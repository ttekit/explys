import { describe, it, expect, vi } from "vitest";
import { render_question } from "./renderQuestion";
import { QuestionType, type VideoRiddleQuestion as VideoRiddleQuestionType } from "../test-session.types";

describe("render_question", () => {
  it("renders VideoRiddleQuestion for VIDEO_RIDDLE type", () => {
    const question: VideoRiddleQuestionType = {
      id: "q-video-1",
      type: QuestionType.VIDEO_RIDDLE,
      subtitleWithBlank: "I ___ to school every day.",
      options: ["go", "run", "jump", "walk"],
      correctAnswer: "go",
      segment: {
        contentVideoId: 10,
        startTimeSec: 1,
        endTimeSec: 5,
      },
    };

    const rendered = render_question({
      question,
      disabled: false,
      onAnswer: vi.fn(),
    });

    expect(rendered).not.toBeNull();
  });

  it("returns null for unknown question type", () => {
    const unknownQuestion = {
      id: "unknown",
      type: "unsupported_type",
    } as unknown as VideoRiddleQuestionType;

    const rendered = render_question({
      question: unknownQuestion,
      disabled: false,
      onAnswer: vi.fn(),
    });

    expect(rendered).toBeNull();
  });
});
