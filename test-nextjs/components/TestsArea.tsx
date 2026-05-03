"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiSubmitComprehensionTest } from "@/lib/api";
import {
  buildComprehensionSummaryQueryString,
  COMPREHENSION_SUMMARY_PATH,
  maxSummaryQueryUrlLength,
  storeComprehensionSummary,
} from "@/lib/comprehension-summary-storage";
import type {
  ComprehensionTestItem,
  GenerateComprehensionTestsResponse,
  SubmitComprehensionTestResponse,
} from "@/lib/types";

type TestsAreaProps = {
  contentVideoId: number;
  data: GenerateComprehensionTestsResponse;
  onSubmitted?: (result: SubmitComprehensionTestResponse) => void;
  /** If true (default), navigate to the test summary page after a successful save. */
  redirectToSummary?: boolean;
};

type CheckState = "idle" | "ok" | "bad";

function questionState(
  t: ComprehensionTestItem,
  picked: number | undefined,
  phase: "check" | "reveal",
): { check: CheckState; feedback: string } {
  if (phase === "reveal" || (picked != null && picked === t.correctIndex)) {
    return {
      check: "ok",
      feedback:
        phase === "reveal" ? "Correct option highlighted below." : "Correct.",
    };
  }
  if (picked == null) {
    return { check: "idle", feedback: "Select an option." };
  }
  return {
    check: "bad",
    feedback: `Not quite. Correct: ${t.options[t.correctIndex] ?? ""}`,
  };
}

export default function TestsArea({
  contentVideoId,
  data,
  onSubmitted,
  redirectToSummary = true,
}: TestsAreaProps) {
  const router = useRouter();
  const { tests, gradingToken } = data;
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [checkPass, setCheckPass] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitComprehensionTestResponse | null>(
    null,
  );
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const setAnswer = (qid: string, idx: number) => {
    setAnswers((a) => ({ ...a, [qid]: idx }));
    setCheckPass(false);
    setReveal(false);
  };

  const onCheck = () => {
    setCheckPass(true);
    setReveal(false);
  };

  const onReveal = () => {
    const next: Record<string, number> = {};
    for (const t of tests) {
      next[t.id] = t.correctIndex;
    }
    setAnswers(next);
    setReveal(true);
    setCheckPass(true);
  };

  const onSubmit = () => {
    if (Object.keys(answers).length < tests.length) {
      setSubmitErr("Please answer every question first.");
      return;
    }
    setSubmitting(true);
    setSubmitErr(null);
    void apiSubmitComprehensionTest(contentVideoId, {
      token: gradingToken,
      answers,
    })
      .then((r) => {
        onSubmitted?.(r);
        if (redirectToSummary) {
          const payload = {
            contentVideoId,
            videoName: data.videoName,
            learnerCefr: r.learnerCefr,
            vocabularyTerms: r.vocabularyTerms,
            result: r,
          };
          const qs = buildComprehensionSummaryQueryString(
            contentVideoId,
            data.videoName,
            r,
          );
          const pathWithQuery = `${COMPREHENSION_SUMMARY_PATH}?${qs}`;
          if (pathWithQuery.length > maxSummaryQueryUrlLength()) {
            storeComprehensionSummary(payload);
            router.push(COMPREHENSION_SUMMARY_PATH);
          } else {
            router.push(pathWithQuery);
          }
        } else {
          setResult(r);
        }
      })
      .catch((e: unknown) => {
        setSubmitErr(e instanceof Error ? e.message : "Submit failed");
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const meta = [
    data.learnerCefr
      ? `Level: ${data.learnerCefr}`
      : "Level: —",
    data.usedTranscript ? "Transcript: yes" : "Transcript: no",
    `Vocab terms: ${data.vocabularyTermsUsed}`,
    `Source: ${data.source}`,
  ].join(" · ");
  const vocabPreview = (data.vocabularyTerms ?? []).slice(0, 12);

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">{meta}</p>
      {vocabPreview.length > 0 ? (
        <p className="text-[11px] leading-relaxed text-zinc-600">
          Words from your list in this test:{" "}
          <span className="text-zinc-500">{vocabPreview.join(", ")}</span>
          {(data.vocabularyTerms?.length ?? 0) > 12 ? " …" : ""}
        </p>
      ) : null}
      <p className="text-xs text-zinc-500">
        Comprehension and grammar. Use <em className="text-zinc-400">Check</em>{" "}
        for feedback, then <strong className="text-zinc-300">Submit</strong> to
        save your score and update topic knowledge when you are signed in and
        content is linked to topics.
      </p>

      <ul className="space-y-3">
        {tests.map((t, idx) => {
          const picked = answers[t.id];
          const phase: "check" | "reveal" = reveal ? "reveal" : "check";
          const forFeedback =
            reveal && picked != null
              ? (picked as number)
              : picked;
          const { check, feedback } = checkPass
            ? questionState(t, forFeedback, phase)
            : { check: "idle" as CheckState, feedback: "" };
          return (
            <li
              key={t.id}
              className={[
                "rounded-[10px] border p-4 transition-colors",
                check === "ok"
                  ? "border-emerald-500/50 bg-emerald-950/20"
                  : check === "bad"
                    ? "border-red-500/40 bg-red-950/20"
                    : "border-zinc-700/80 bg-zinc-900/50",
              ].join(" ")}
            >
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-zinc-500">
                <span className="text-zinc-300">Q{idx + 1}</span>
                <span
                  className={
                    t.category === "grammar"
                      ? " ml-2 rounded bg-violet-500/20 px-1.5 py-0.5 text-violet-300"
                      : " ml-2 rounded bg-sky-500/20 px-1.5 py-0.5 text-sky-300"
                  }
                >
                  {t.category === "grammar" ? "Grammar" : "Comprehension"}
                </span>
              </p>
              <p className="mt-2 text-sm font-medium text-zinc-100">
                {t.question}
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {t.options.map((opt, i) => {
                  const isCorrect = i === t.correctIndex;
                  const showAsSelected = reveal ? isCorrect : picked === i;
                  const showGreen = (checkPass && isCorrect) || (reveal && isCorrect);
                  return (
                    <label
                      key={i}
                      className={[
                        "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-white/5",
                        showGreen ? "text-emerald-300" : "text-zinc-300",
                        !reveal && picked === i && !isCorrect
                          ? "text-sky-200"
                          : "",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        className="mt-1"
                        name={`q-${t.id}`}
                        checked={showAsSelected}
                        onChange={() => {
                          if (!reveal) setAnswer(t.id, i);
                        }}
                        disabled={reveal}
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
              {checkPass ? (
                <p
                  className={
                    check === "ok"
                      ? "mt-2 text-sm text-emerald-400"
                      : check === "bad"
                        ? "mt-2 text-sm text-red-300"
                        : "mt-2 text-sm text-amber-400"
                  }
                >
                  {feedback}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button
          type="button"
          onClick={onCheck}
          className="rounded-lg border border-zinc-600 bg-zinc-800/90 px-4 py-2 text-sm font-bold text-zinc-200 hover:bg-zinc-700"
        >
          Check answers
        </button>
        <button
          type="button"
          onClick={onReveal}
          className="rounded-lg border border-zinc-600 bg-transparent px-4 py-2 text-sm font-bold text-zinc-400 hover:text-zinc-200"
        >
          Reveal correct
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="rounded-lg border border-emerald-500/50 bg-zinc-900 px-4 py-2 text-sm font-bold text-emerald-300 hover:bg-zinc-800 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Save results & update knowledge"}
        </button>
      </div>

      {submitErr ? (
        <p className="text-sm text-red-400" role="alert">
          {submitErr}
        </p>
      ) : null}
      {result ? (
        <div
          className="mt-2 rounded-lg border border-zinc-700 bg-zinc-900/80 p-4 text-sm"
          role="status"
        >
          <p className="text-lg font-bold text-emerald-400">
            {result.correct} / {result.total} ({result.percentage}%)
          </p>
          <p className="mt-1 text-zinc-500">
            Comprehension: {result.comprehension.correct}/
            {result.comprehension.total} — Grammar: {result.grammar.correct}/
            {result.grammar.total}
          </p>
          <p className="mt-2 text-zinc-200">{result.message}</p>
          {result.knowledgeUpdates.length > 0 ? (
            <ul className="mt-2 list-inside list-disc text-zinc-400">
              {result.knowledgeUpdates.map((k) => (
                <li key={k.topicId}>
                  Topic {k.topicId}: {k.previousScore} → {k.newScore}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
