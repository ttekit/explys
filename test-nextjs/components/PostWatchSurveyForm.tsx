"use client";

import { useState } from "react";
import { apiSubmitPostWatchSurvey } from "@/lib/api";
import type { PostWatchSurveyQuestion } from "@/lib/types";

type PostWatchSurveyFormProps = {
  surveyId: number;
  questions: PostWatchSurveyQuestion[];
  onDismiss: () => void;
  onSubmitted: () => void;
};

function initialAnswers(questions: PostWatchSurveyQuestion[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (const q of questions) {
    o[q.id] = "";
  }
  return o;
}

export function PostWatchSurveyForm({
  surveyId,
  questions,
  onDismiss,
  onSubmitted,
}: PostWatchSurveyFormProps) {
  const [answers, setAnswers] = useState(() => initialAnswers(questions));
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setErr(null);
    for (const q of questions) {
      const v = (answers[q.id] ?? "").trim();
      if (!v) {
        setErr("Please answer every question before submitting.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload: Record<string, string> = {};
      for (const q of questions) {
        payload[q.id] = (answers[q.id] ?? "").trim();
      }
      await apiSubmitPostWatchSurvey(surveyId, payload);
      onSubmitted();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not submit survey.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-watch-survey-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-950">
        <h2
          id="post-watch-survey-title"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
        >
          Short survey
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          You finished the video. A few quick questions help us improve lessons.
        </p>

        <div className="mt-4 space-y-5">
          {questions.map((q) => (
            <div key={q.id}>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {q.prompt}
              </p>
              {q.type === "short_text" ? (
                <textarea
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                  rows={3}
                  value={answers[q.id] ?? ""}
                  onChange={(e) =>
                    setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                  }
                />
              ) : null}
              {q.type === "likert" || q.type === "mcq" ? (
                <ul className="mt-2 space-y-1.5">
                  {(q.options ?? []).map((opt) => (
                    <li key={opt}>
                      <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                        <input
                          type="radio"
                          className="mt-0.5"
                          name={q.id}
                          checked={(answers[q.id] ?? "") === opt}
                          onChange={() =>
                            setAnswers((a) => ({ ...a, [q.id]: opt }))
                          }
                        />
                        <span>{opt}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>

        {err ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{err}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onDismiss}
            disabled={submitting}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Later
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
