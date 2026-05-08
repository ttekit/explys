import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Lock,
  XCircle,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { ChameleonMascot } from "../ChameleonMascot";
import type { QuizQuestion } from "./defaultLessonSides";

const OPEN_MIN_CHARS = 40;

function isOpenQuestion(q: QuizQuestion): boolean {
  return q.questionType === "open" || q.category === "open";
}

/** Rough sentence count for learner-written text (period / ? / !). */
function sentenceCount(text: string): number {
  return text
    .trim()
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8).length;
}

function openAnswerIsValid(text: string): boolean {
  const t = text.trim();
  return t.length >= OPEN_MIN_CHARS && sentenceCount(t) >= 2;
}

export type QuizWrongReviewItem = {
  question: string;
  options: string[];
  selectedIndex: number;
  correctIndex: number;
  explanation?: string;
  category?: "comprehension" | "grammar" | "vocabulary" | "open";
};

export type VideoQuizCompleteSummary = {
  /** MCQ items only until the server merges in the written score on submit. */
  correctCount: number;
  totalQuestions: number;
  /** MCQ index or open-ended text per question id — must match backend token ids. */
  answersById: Record<string, number | string>;
  wrongReview: QuizWrongReviewItem[];
};

interface VideoQuizProps {
  questions: QuizQuestion[];
  isVideoComplete: boolean;
  onComplete: (summary: VideoQuizCompleteSummary) => void;
}

export function VideoQuiz({
  questions,
  isVideoComplete,
  onComplete,
}: VideoQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [openDraft, setOpenDraft] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [answersById, setAnswersById] = useState<Record<string, number | string>>(
    {},
  );

  const question = questions[currentQuestion];
  const isOpen = question ? isOpenQuestion(question) : false;
  const isCorrect =
    !isOpen && question ? selectedAnswer === question.correct : false;

  const mcqTotal = questions.filter((q) => !isOpenQuestion(q)).length;
  const hasOpen = questions.some(isOpenQuestion);

  useEffect(() => {
    if (!question) return;
    if (isOpenQuestion(question)) {
      const stored = answersById[question.id];
      setOpenDraft(typeof stored === "string" ? stored : "");
    } else {
      setOpenDraft("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when step changes
  }, [currentQuestion]);

  if (!isVideoComplete) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Lock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">Quiz locked</h3>
        <p className="text-sm text-muted-foreground">
          Finish watching the lesson to unlock the quiz and earn XP.
        </p>
      </div>
    );
  }

  if (showResults) {
    const mcqPct =
      mcqTotal > 0 ? Math.round((correctCount / mcqTotal) * 100) : 0;
    const mood =
      mcqPct >= 80 ? "excited" : mcqPct >= 50 ? "happy" : "thinking";

    const wrongReview: QuizWrongReviewItem[] = [];
    for (const q of questions) {
      if (isOpenQuestion(q)) continue;
      const picked = answersById[q.id];
      if (typeof picked !== "number" || picked === q.correct) {
        continue;
      }
      wrongReview.push({
        question: q.question,
        options: q.options,
        selectedIndex: picked,
        correctIndex: q.correct,
        explanation: q.explanation,
        category: q.category,
      });
    }

    return (
      <div className="py-4 text-center">
        <ChameleonMascot size="md" mood={mood} className="mx-auto mb-4" />

        <h3 className="mb-2 text-xl font-bold text-foreground">Quiz complete</h3>

        <div className="mb-4 rounded-xl bg-muted p-4">
          <p className="mb-1 text-3xl font-bold text-primary">
            {correctCount}/{mcqTotal}
          </p>
          <p className="text-sm text-muted-foreground">{mcqPct}% multiple choice</p>
          {hasOpen ? (
            <p className="mt-3 text-xs leading-snug text-muted-foreground">
              Your written summary is included in the final score when you tap{" "}
              <span className="font-medium text-foreground">Complete lesson</span>{" "}
              (submitted to the server with your answers).
            </p>
          ) : null}
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {mcqPct >= 80
            ? "Strong work on the multiple-choice items."
            : mcqPct >= 50
              ? "Good effort — skim vocabulary once more."
              : "Review the clip and vocabulary, then retry."}
        </p>

        <button
          type="button"
          onClick={() =>
            onComplete({
              correctCount,
              totalQuestions: questions.length,
              answersById,
              wrongReview,
            })
          }
          className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Complete lesson
        </button>
      </div>
    );
  }

  function handleSubmit() {
    if (!question) return;

    if (isOpen) {
      if (!isAnswered) {
        if (!openAnswerIsValid(openDraft)) return;
        setIsAnswered(true);
        setAnswersById((prev) => ({
          ...prev,
          [question.id]: openDraft.trim(),
        }));
        return;
      }
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion((prev) => prev + 1);
        setSelectedAnswer(null);
        setIsAnswered(false);
      } else {
        setShowResults(true);
      }
      return;
    }

    if (selectedAnswer === null) return;

    if (!isAnswered) {
      setIsAnswered(true);
      setAnswersById((prev) => ({
        ...prev,
        [question.id]: selectedAnswer,
      }));
      if (selectedAnswer === question.correct) {
        setCorrectCount((prev) => prev + 1);
      }
      return;
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setShowResults(true);
    }
  }

  const primaryDisabled = isOpen
    ? !isAnswered
      ? !openAnswerIsValid(openDraft)
      : false
    : !isAnswered
      ? selectedAnswer === null
      : false;

  const categoryLabel =
    question.category === "grammar"
      ? "Grammar"
      : question.category === "vocabulary"
        ? "Vocabulary"
        : question.category === "comprehension"
          ? "Comprehension"
          : question.category === "open"
            ? "Summary"
            : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Question {currentQuestion + 1} of {questions.length}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />≈ {question.timestamp}
        </span>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{
            width: `${((currentQuestion + 1) / questions.length) * 100}%`,
          }}
        />
      </div>

      {categoryLabel ? (
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {categoryLabel}
        </p>
      ) : null}

      <h3 className="text-lg leading-relaxed font-semibold text-foreground">
        {question.question}
      </h3>

      {isOpen ? (
        <>
          <textarea
            value={openDraft}
            onChange={(e) => setOpenDraft(e.target.value)}
            disabled={isAnswered}
            rows={5}
            placeholder="Write 2–3 clear sentences in English."
            className="focus:ring-primary/40 w-full resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:outline-none disabled:opacity-80"
          />
          {!isAnswered ? (
            <p className="text-xs text-muted-foreground">
              Aim for at least {OPEN_MIN_CHARS} characters and two sentences.
            </p>
          ) : null}
        </>
      ) : (
        <div className="space-y-2">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const showCorrect = isAnswered && index === question.correct;
            const showWrong = isAnswered && isSelected && !isCorrect;

            return (
              <button
                key={index}
                type="button"
                disabled={isAnswered}
                onClick={() => {
                  if (!isAnswered) setSelectedAnswer(index);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border-2 p-3 text-left transition-all",
                  !isAnswered && isSelected && "border-primary bg-primary/10",
                  !isAnswered &&
                    !isSelected &&
                    "border-border bg-card hover:border-primary/50",
                  showCorrect && "border-accent bg-accent/10",
                  showWrong && "border-destructive bg-destructive/10",
                  isAnswered && !showCorrect && !showWrong && "opacity-50",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
                    !isAnswered && isSelected && "bg-primary text-primary-foreground",
                    !isAnswered && !isSelected && "bg-muted text-muted-foreground",
                    showCorrect && "bg-accent text-accent-foreground",
                    showWrong && "bg-destructive text-destructive-foreground",
                  )}
                >
                  {showCorrect ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : showWrong ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    String.fromCharCode(65 + index)
                  )}
                </span>
                <span className="text-sm text-foreground">{option}</span>
              </button>
            );
          })}
        </div>
      )}

      {isAnswered ? (
        <div
          className={cn(
            "rounded-lg p-3 text-sm",
            isOpen
              ? "bg-muted/80 text-foreground"
              : isCorrect
                ? "bg-accent/10 text-accent"
                : "bg-destructive/10 text-destructive",
          )}
        >
          {isOpen
            ? "Response saved — your summary will be graded when you complete the lesson."
            : isCorrect
              ? "Correct — nice job."
              : `Not quite. Answer: ${question.options[question.correct]}`}
          {!isOpen && !isCorrect && question.explanation?.trim() ? (
            <span className="mt-2 block text-foreground">{question.explanation}</span>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        disabled={primaryDisabled}
        onClick={handleSubmit}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50",
        )}
      >
        {!isAnswered ? (
          "Check answer"
        ) : currentQuestion < questions.length - 1 ? (
          <>
            Next question <ArrowRight className="h-4 w-4" />
          </>
        ) : (
          "See results"
        )}
      </button>
    </div>
  );
}

export function LessonCompleteBanner({
  xpEarned,
}: {
  xpEarned: number;
}) {
  return (
    <div className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-center">
      <ChameleonMascot size="sm" mood="excited" className="mx-auto mb-2" />
      <p className="font-semibold text-foreground">Lesson complete</p>
      <p className="mb-3 text-sm text-muted-foreground">You earned {xpEarned} XP</p>
      <Link
        to="/catalog"
        className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Next in catalog
      </Link>
    </div>
  );
}
