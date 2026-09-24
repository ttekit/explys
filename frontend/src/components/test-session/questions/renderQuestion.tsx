import { QuestionType, type TestQuestion } from "../test-session.types";
import { RewardCheckpoint } from "./RewardCheckpoint";
import { SentenceBuilderQuestion } from "./SentenceBuilderQuestion";
import { SwipeCardQuestion } from "./SwipeCardQuestion";
import { TextPickQuestion } from "./TextPickQuestion";
import { VideoRiddleQuestion } from "./VideoRiddleQuestion";
import type { AnswerResult } from "../test-session.types";

type RenderQuestionOptions = {
  readonly question: TestQuestion;
  readonly disabled: boolean;
  readonly onAnswer: (result: AnswerResult) => void;
  readonly onContinue?: () => void;
};

/**
 * Dispatches to the correct question sub-component by type.
 */
export function render_question({
  question,
  disabled,
  onAnswer,
  onContinue,
}: RenderQuestionOptions) {
  switch (question.type) {
    case QuestionType.TEXT_PICK:
      return (
        <TextPickQuestion
          question={question}
          disabled={disabled}
          onAnswer={onAnswer}
        />
      );
    case QuestionType.VIDEO_RIDDLE:
      return (
        <VideoRiddleQuestion
          question={question}
          disabled={disabled}
          onAnswer={onAnswer}
        />
      );
    case QuestionType.SWIPE_CARD:
      return (
        <SwipeCardQuestion
          question={question}
          disabled={disabled}
          onAnswer={onAnswer}
        />
      );
    case QuestionType.SENTENCE_BUILDER:
      return (
        <SentenceBuilderQuestion
          question={question}
          disabled={disabled}
          onAnswer={onAnswer}
        />
      );
    case QuestionType.REWARD_CHECKPOINT:
      return (
        <RewardCheckpoint
          question={question}
          onContinue={onContinue ?? (() => undefined)}
        />
      );
    default:
      return null;
  }
}
