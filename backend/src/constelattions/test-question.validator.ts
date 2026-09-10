import { adapt_legacy_quiz_items, is_legacy_quiz_item } from "./legacy-quiz.adapter";
import {
  QuestionType,
  type LegacyQuizItem,
  type TestQuestion,
  type VideoSegmentRef,
} from "./test-question.types";

/**
 * Normalizes star metadata into validated test questions.
 */
export function normalize_star_questions(
  metadata: Record<string, unknown> | null | undefined,
  starContentVideoId?: number | null,
): TestQuestion[] {
  const direct = parse_questions_array(metadata?.questions, starContentVideoId);
  if (direct.length > 0) {
    return direct;
  }
  const legacyQuiz = parse_legacy_quiz_array(metadata?.quiz);
  const legacyQuestions = parse_legacy_quiz_array(metadata?.questions);
  const legacyItems = legacyQuiz.length > 0 ? legacyQuiz : legacyQuestions;
  if (legacyItems.length > 0) {
    return adapt_legacy_quiz_items(legacyItems);
  }
  return [];
}

function parse_legacy_quiz_array(value: unknown): LegacyQuizItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(is_legacy_quiz_item);
}

function parse_questions_array(
  value: unknown,
  starContentVideoId?: number | null,
): TestQuestion[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item, index) => parse_question_item(item, index, starContentVideoId))
    .filter((item): item is TestQuestion => item !== null);
}

function parse_question_item(
  value: unknown,
  index: number,
  starContentVideoId?: number | null,
): TestQuestion | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const type = record.type;
  const id =
    typeof record.id === "string" && record.id.length > 0
      ? record.id
      : `q-${index + 1}`;
  const segment = parse_segment(record.segment, starContentVideoId);
  if (type === QuestionType.TEXT_PICK) {
    return parse_text_pick(id, record);
  }
  if (type === QuestionType.VIDEO_RIDDLE) {
    return parse_video_riddle(id, record, segment);
  }
  if (type === QuestionType.SWIPE_CARD) {
    return parse_swipe_card(id, record);
  }
  if (type === QuestionType.SENTENCE_BUILDER) {
    return parse_sentence_builder(id, record, segment);
  }
  if (type === QuestionType.BLIND_AUDIO) {
    return parse_blind_audio(id, record, segment);
  }
  if (type === QuestionType.REWARD_CHECKPOINT) {
    return parse_reward_checkpoint(id, record, segment);
  }
  return null;
}

function parse_segment(
  value: unknown,
  starContentVideoId?: number | null,
): VideoSegmentRef | undefined {
  if (typeof value !== "object" || value === null) {
    return starContentVideoId ? { contentVideoId: starContentVideoId } : undefined;
  }
  const record = value as Record<string, unknown>;
  const segment: VideoSegmentRef = {
    contentVideoId:
      typeof record.contentVideoId === "number"
        ? record.contentVideoId
        : starContentVideoId ?? undefined,
    startTimeSec:
      typeof record.startTimeSec === "number" ? record.startTimeSec : undefined,
    endTimeSec:
      typeof record.endTimeSec === "number" ? record.endTimeSec : undefined,
  };
  return segment.contentVideoId !== undefined ? segment : undefined;
}

function parse_text_pick(
  id: string,
  record: Record<string, unknown>,
): TestQuestion | null {
  const options = parse_string_array(record.options);
  if (typeof record.correctAnswer !== "string" || options.length < 3) {
    return null;
  }
  return {
    id,
    type: QuestionType.TEXT_PICK,
    prompt: typeof record.prompt === "string" ? record.prompt : undefined,
    options: [options[0]!, options[1]!, options[2]!],
    correctAnswer: record.correctAnswer,
  };
}

function parse_video_riddle(
  id: string,
  record: Record<string, unknown>,
  segment?: VideoSegmentRef,
): TestQuestion | null {
  const options = parse_string_array(record.options);
  if (
    typeof record.subtitleWithBlank !== "string" ||
    typeof record.correctAnswer !== "string" ||
    options.length < 4
  ) {
    return null;
  }
  return {
    id,
    type: QuestionType.VIDEO_RIDDLE,
    segment,
    subtitleWithBlank: record.subtitleWithBlank,
    options: [options[0]!, options[1]!, options[2]!, options[3]!],
    correctAnswer: record.correctAnswer,
  };
}

function parse_swipe_card(
  id: string,
  record: Record<string, unknown>,
): TestQuestion | null {
  if (!Array.isArray(record.cards)) {
    return null;
  }
  const cards = record.cards
    .map((card, cardIndex) => {
      if (typeof card !== "object" || card === null) {
        return null;
      }
      const cardRecord = card as Record<string, unknown>;
      if (
        typeof cardRecord.word !== "string" ||
        typeof cardRecord.hint !== "string" ||
        typeof cardRecord.isMatch !== "boolean"
      ) {
        return null;
      }
      return {
        id:
          typeof cardRecord.id === "string"
            ? cardRecord.id
            : `${id}-card-${cardIndex + 1}`,
        word: cardRecord.word,
        hint: cardRecord.hint,
        thumbnailUrl:
          typeof cardRecord.thumbnailUrl === "string"
            ? cardRecord.thumbnailUrl
            : undefined,
        isMatch: cardRecord.isMatch,
      };
    })
    .filter((card): card is NonNullable<typeof card> => card !== null);
  if (cards.length === 0) {
    return null;
  }
  return { id, type: QuestionType.SWIPE_CARD, cards };
}

function parse_sentence_builder(
  id: string,
  record: Record<string, unknown>,
  segment?: VideoSegmentRef,
): TestQuestion | null {
  const wordChips = parse_string_array(record.wordChips);

  if (
    typeof record.targetPhrase !== "string" ||
    wordChips.length < 2
  ) {
    return null;
  }

  return {
    id,
    type: QuestionType.SENTENCE_BUILDER,
    segment,
    prompt:
      typeof record.prompt === "string"
        ? record.prompt
        : undefined,
    targetPhrase: record.targetPhrase,
    wordChips,
  };
}

function parse_blind_audio(
  id: string,
  record: Record<string, unknown>,
  segment?: VideoSegmentRef,
): TestQuestion | null {
  const options = parse_string_array(record.options);
  if (
    typeof record.correctAnswer !== "string" ||
    options.length < 3
  ) {
    return null;
  }
  return {
    id,
    type: QuestionType.BLIND_AUDIO,
    segment,
    prompt: typeof record.prompt === "string" ? record.prompt : undefined,
    options: [options[0]!, options[1]!, options[2]!],
    correctAnswer: record.correctAnswer,
  };
}

function parse_reward_checkpoint(
  id: string,
  record: Record<string, unknown>,
  segment?: VideoSegmentRef,
): TestQuestion | null {
  if (typeof record.message !== "string") {
    return null;
  }
  return {
    id,
    type: QuestionType.REWARD_CHECKPOINT,
    segment,
    message: record.message,
  };
}

function parse_string_array(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}
