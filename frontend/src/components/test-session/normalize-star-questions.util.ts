import {
  QuestionType,
  type TextPickQuestion,
  type TestQuestion,
} from "./test-session.types";

type LegacyQuizItemInput = {
  readonly question: string;
  readonly options: readonly string[];
  readonly correctAnswer: string;
};

/**
 * Client-side fallback when API omits normalizedQuestions.
 */
export function normalize_star_questions(
  metadata: Record<string, unknown> | null | undefined,
  normalizedFromApi?: TestQuestion[],
): TestQuestion[] {
  if (normalizedFromApi && normalizedFromApi.length > 0) {
    return normalizedFromApi;
  }
  const direct = parse_questions(metadata?.questions);
  if (direct.length > 0) {
    return direct;
  }
  const legacyQuiz = parse_legacy(metadata?.quiz);
  const legacyQuestions = parse_legacy(metadata?.questions);
  const legacy = legacyQuiz.length > 0 ? legacyQuiz : legacyQuestions;
  return legacy.map((item, index) => adapt_legacy(item, `legacy-${index + 1}`));
}

function parse_legacy(value: unknown): LegacyQuizItemInput[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(is_legacy_quiz);
}

function is_legacy_quiz(value: unknown): value is LegacyQuizItemInput {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.question === "string" &&
    Array.isArray(record.options) &&
    typeof record.correctAnswer === "string"
  );
}

function adapt_legacy(
  item: LegacyQuizItemInput,
  id: string,
): TextPickQuestion {
  const options = [...item.options];
  while (options.length < 3) {
    options.push(`Option ${options.length + 1}`);
  }
  return {
    id,
    type: QuestionType.TEXT_PICK,
    prompt: item.question,
    options: [options[0]!, options[1]!, options[2]!],
    correctAnswer: item.correctAnswer,
  };
}

function parse_questions(value: unknown): TestQuestion[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is TestQuestion => {
    if (typeof item !== "object" || item === null) {
      return false;
    }
    const record = item as Record<string, unknown>;
    return typeof record.id === "string" && typeof record.type === "string";
  });
}
