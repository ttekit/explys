import { normalize_star_questions } from "./test-question.validator";
import { QuestionType } from "./test-question.types";

describe("test-question.validator", () => {
  it("prefers metadata.questions over legacy quiz", () => {
    const result = normalize_star_questions({
      questions: [
        {
          id: "q1",
          type: QuestionType.BLIND_AUDIO,
          prompt: "Pick one",
          options: ["A", "B", "C"],
          correctAnswer: "A",
        },
      ],
      quiz: [
        {
          question: "Legacy?",
          options: ["X", "Y", "Z"],
          correctAnswer: "X",
        },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("q1");
    expect(result[0]?.type).toBe(QuestionType.BLIND_AUDIO);
  });

  it("falls back to legacy quiz as text_pick", () => {
    const result = normalize_star_questions({
      quiz: [
        {
          question: "Where are you?",
          options: ["Where are you?", "You where?", "Where you?"],
          correctAnswer: "Where are you?",
        },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.type).toBe(QuestionType.TEXT_PICK);
  });

  it("converts video_riddle to text_pick without segments", () => {
    const result = normalize_star_questions(
      {
        questions: [
          {
            id: "vr1",
            type: QuestionType.VIDEO_RIDDLE,
            subtitleWithBlank: "I ___ here.",
            options: ["am", "is", "are", "be"],
            correctAnswer: "am",
          },
        ],
      },
      42,
    );
    expect(result[0]?.type).toBe(QuestionType.VIDEO_RIDDLE);
    if (result[0]?.type === QuestionType.VIDEO_RIDDLE) {
      expect(result[0].correctAnswer).toBe("am");
    }
  });
});
