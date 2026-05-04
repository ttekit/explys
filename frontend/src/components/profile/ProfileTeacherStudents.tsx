import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router";
import { ChevronDown, ChevronRight, GraduationCap, Loader2 } from "lucide-react";
import { apiFetch, getResponseErrorMessage } from "../../lib/api";
import { cn } from "../../lib/utils";
import { ProfileCard } from "./ProfileCard";

export type TeacherStudentResult = {
  id: number;
  name: string;
  email: string;
  role: string;
  englishLevel: string | null;
  videosCompleted: number;
  quizAttempts: number;
  avgQuizScorePct: number | null;
  lastPlacement: {
    scorePct: number;
    englishLevel: string;
    scoreCorrect: number;
    scoreTotal: number;
    createdAt: string;
  } | null;
  recentQuizzes: {
    id: number;
    contentVideoId: number;
    videoName: string;
    correct: number;
    total: number;
    scorePct: number;
    passed: boolean;
    createdAt: string;
  }[];
};

export function ProfileTeacherStudents() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<TeacherStudentResult[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiFetch("/teacher/my-students/results", {
          method: "GET",
        });
        if (!res.ok) {
          setError(await getResponseErrorMessage(res));
          setStudents([]);
          return;
        }
        const data: unknown = await res.json();
        const list = (data as { students?: TeacherStudentResult[] }).students;
        if (!cancelled) {
          setStudents(Array.isArray(list) ? list : []);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load student results.");
          setStudents([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleRow = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p>Loading student results…</p>
      </div>
    );
  }

  if (error) {
    return (
      <ProfileCard title="Student results">
        <p className="text-destructive">{error}</p>
      </ProfileCard>
    );
  }

  if (students.length === 0) {
    return (
      <ProfileCard title="Student results">
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <GraduationCap className="size-12 text-muted-foreground opacity-50" />
          <p className="max-w-md text-muted-foreground">
            No students are linked to your teacher account yet. Students choose
            you during registration or an admin assigns them.
          </p>
        </div>
      </ProfileCard>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Overview of learners assigned to you: completed watches (sessions),
        comprehension quizzes, placement level, and recent quiz scores per
        lesson.
      </p>

      <div className="overflow-hidden rounded-xl border border-border/50 bg-card/50">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-border bg-muted/30 border-b text-muted-foreground">
                <th className="p-3 font-medium" />
                <th className="p-3 font-medium">Student</th>
                <th className="p-3 font-medium">Level</th>
                <th className="p-3 text-center font-medium">Videos done</th>
                <th className="p-3 text-center font-medium">Quizzes</th>
                <th className="p-3 text-center font-medium">Avg score</th>
                <th className="p-3 font-medium">Placement</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const isOpen = expanded.has(s.id);
                const placementLabel = s.lastPlacement
                  ? `${s.lastPlacement.englishLevel} · ${Math.round(s.lastPlacement.scorePct)}% (${s.lastPlacement.scoreCorrect}/${s.lastPlacement.scoreTotal})`
                  : "—";
                return (
                  <Fragment key={s.id}>
                    <tr className="border-border/60 hover:bg-muted/20 border-b transition-colors">
                      <td className="p-2">
                        <button
                          type="button"
                          onClick={() => toggleRow(s.id)}
                          className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-1.5"
                          aria-expanded={isOpen}
                          aria-label={
                            isOpen ? "Hide quiz details" : "Show quiz details"
                          }
                        >
                          {isOpen ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="text-foreground font-medium">
                          {s.name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {s.email}
                        </div>
                      </td>
                      <td className="text-foreground p-3">
                        {s.englishLevel?.trim() || "—"}
                      </td>
                      <td className="p-3 text-center tabular-nums">
                        {s.videosCompleted}
                      </td>
                      <td className="p-3 text-center tabular-nums">
                        {s.quizAttempts}
                      </td>
                      <td className="p-3 text-center tabular-nums">
                        {s.avgQuizScorePct != null
                          ? `${s.avgQuizScorePct}%`
                          : "—"}
                      </td>
                      <td className="text-muted-foreground max-w-[220px] truncate p-3">
                        {placementLabel}
                      </td>
                    </tr>
                    {isOpen ? (
                      <tr className="bg-background/50">
                        <td colSpan={7} className="p-0">
                          <div className="border-border border-t px-4 py-4">
                            <h4 className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
                              Recent comprehension quizzes
                            </h4>
                            {s.recentQuizzes.length === 0 ? (
                              <p className="text-muted-foreground text-sm">
                                No quiz attempts recorded yet.
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {s.recentQuizzes.map((q) => (
                                  <li
                                    key={q.id}
                                    className="border-border/40 bg-card/80 flex flex-col gap-1 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <Link
                                        to={`/content/${q.contentVideoId}`}
                                        className="text-primary font-medium hover:underline"
                                      >
                                        {q.videoName}
                                      </Link>
                                      <div className="text-muted-foreground text-xs">
                                        {new Date(q.createdAt).toLocaleString()}
                                      </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-3 text-sm">
                                      <span
                                        className={cn(
                                          "font-semibold tabular-nums",
                                          q.passed
                                            ? "text-accent"
                                            : "text-muted-foreground",
                                        )}
                                      >
                                        {Math.round(q.scorePct)}%
                                      </span>
                                      <span className="text-muted-foreground tabular-nums">
                                        {q.correct}/{q.total}
                                      </span>
                                      <span
                                        className={cn(
                                          "rounded px-2 py-0.5 text-xs font-medium",
                                          q.passed
                                            ? "bg-accent/15 text-accent"
                                            : "bg-muted text-muted-foreground",
                                        )}
                                      >
                                        {q.passed ? "Passed" : "Review"}
                                      </span>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
