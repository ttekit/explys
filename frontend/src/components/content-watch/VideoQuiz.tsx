import { useState } from "react";
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

export type VideoQuizCompleteSummary = {
  correctCount: number;
  totalQuestions: number;
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
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResults, setShowResults] = useState(false);

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
    const percentage = Math.round((correctCount / questions.length) * 100);
    const mood =
      percentage >= 80 ? "excited" : percentage >= 50 ? "happy" : "thinking";

    return (
      <div className="py-4 text-center">
        <ChameleonMascot size="md" mood={mood} className="mx-auto mb-4" />

        <h3 className="mb-2 text-xl font-bold text-foreground">Quiz complete</h3>

        <div className="mb-4 rounded-xl bg-muted p-4">
          <p className="mb-1 text-3xl font-bold text-primary">
            {correctCount}/{questions.length}
          </p>
          <p className="text-sm text-muted-foreground">{percentage}% correct</p>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {percentage >= 80
            ? "Strong work — you’re ready for the next lesson."
            : percentage >= 50
              ? "Good effort — skim vocabulary once more."
              : "Review the clip and vocabulary, then retry."}
        </p>

        <button
          type="button"
          onClick={() =>
            onComplete({
              correctCount,
              totalQuestions: questions.length,
            })
          }
          className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Complete lesson
        </button>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const isCorrect = selectedAnswer === question.correct;

  function handleSubmit() {
    if (selectedAnswer === null) return;

    if (!isAnswered) {
      setIsAnswered(true);
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

      <h3 className="text-lg leading-relaxed font-semibold text-foreground">
        {question.question}
      </h3>

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

      {isAnswered ? (
        <div
          className={cn(
            "rounded-lg p-3 text-sm",
            isCorrect ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive",
          )}
        >
          {isCorrect
            ? "Correct — nice job."
            : `Not quite. Answer: ${question.options[question.correct]}`}
        </div>
      ) : null}

      <button
        type="button"
        disabled={selectedAnswer === null}
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
