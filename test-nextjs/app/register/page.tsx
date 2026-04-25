"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRegister } from "@/lib/api";
import { setSession } from "@/lib/session";
import { buildPupilCredentialsList } from "@/lib/teacher-student-accounts";
import {
  buildTeacherCredentialsSheetCsv,
  downloadTextFile,
} from "@/lib/teacher-roster-csv";
import type { TeacherStudentRow } from "@/lib/teacher-roster.types";

function newTeacherRow(): TeacherStudentRow {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `row-${Date.now()}-${Math.random()}`,
    firstName: "",
    lastName: "",
  };
}

function teacherRowsToStudentNamesString(rows: TeacherStudentRow[]): string {
  const lines = rows
    .map((r) => {
      const a = r.firstName.trim();
      const b = r.lastName.trim();
      if (!a && !b) return null;
      return b ? `${a} ${b}`.trim() : a;
    })
    .filter((line): line is string => Boolean(line));
  return lines.join("\n");
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [englishLevel, setEnglishLevel] = useState("B1");
  const [hobbies, setHobbies] = useState("reading, music");
  const [education, setEducation] = useState("");
  const [workField, setWorkField] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("uk");
  const [role, setRole] = useState("adult");
  const [teacherGrades, setTeacherGrades] = useState("");
  const [teacherTopics, setTeacherTopics] = useState("");
  const [studentNames, setStudentNames] = useState("");
  const [teacherStudentRows, setTeacherStudentRows] = useState<TeacherStudentRow[]>([
    newTeacherRow(),
  ]);
  const [studentGrade, setStudentGrade] = useState("");
  const [studentProblemTopics, setStudentProblemTopics] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function splitList(s: string): string[] {
    return s
      .split(/[,;]/)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const isTeacher = role === "teacher";
      const hobbyList = splitList(hobbies);
      const passTrimmed = password.trim();
      const payload: Parameters<typeof apiRegister>[0] = {
        name: name.trim(),
        email: email.trim(),
        password: passTrimmed,
        role: role || "adult",
      };
      if (!isTeacher) {
        payload.englishLevel = englishLevel || undefined;
        payload.hobbies = hobbyList.length ? hobbyList : undefined;
        payload.education = education.trim() || undefined;
        payload.workField = workField.trim() || undefined;
        payload.nativeLanguage = nativeLanguage.trim() || undefined;
      }
      let teacherPupils: ReturnType<typeof buildPupilCredentialsList> = [];
      if (isTeacher) {
        if (teacherGrades.trim()) payload.teacherGrades = teacherGrades.trim();
        const tt = splitList(teacherTopics);
        if (tt.length) payload.teacherTopics = tt;
        const roster = teacherRowsToStudentNamesString(teacherStudentRows);
        if (roster) payload.studentNames = roster;
        teacherPupils = buildPupilCredentialsList(
          teacherStudentRows,
          email.trim(),
        );
        if (teacherPupils.length) {
          payload.studentAccounts = teacherPupils;
        }
      }
      if (role === "student") {
        if (studentNames.trim()) payload.studentNames = studentNames.trim();
        if (studentGrade.trim()) payload.studentGrade = studentGrade.trim();
        const st = splitList(studentProblemTopics);
        if (st.length) payload.studentProblemTopics = st;
      }
      const session = await apiRegister(payload);
      setSession(session);
      if (isTeacher) {
        const csv = buildTeacherCredentialsSheetCsv({
          teacherName: name.trim(),
          teacherEmail: email.trim(),
          teacherPassword: passTrimmed,
          pupils: teacherPupils,
        });
        const stamp = new Date().toISOString().slice(0, 10);
        downloadTextFile(`class-credentials-${stamp}.csv`, csv);
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Register error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className={`mx-auto px-4 py-10 ${role === "teacher" ? "max-w-2xl" : "max-w-md"}`}
    >
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        Register
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        Calls <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">POST /auth/register</code> — includes <code className="text-xs">role</code> (adult / teacher / student) and role-specific profile fields matching the backend.
        {role === "teacher" ? (
          <span>
            {" "}
            For teachers, the same list creates real <strong>student</strong>{" "}
            accounts in the API (with <code>teacher_id</code>), and a CSV
            (Excel-friendly) with names, logins, and passwords downloads
            after sign-up.
          </span>
        ) : null}
      </p>
      <form onSubmit={onSubmit} className="mt-6 max-h-[min(70vh,520px)] space-y-3 overflow-y-auto pr-1">
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Name
          </label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Email
          </label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            type="text"
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Password
          </label>
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="8+ chars, upper, lower, digit"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Role
          </label>
          <select
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="adult">adult (learner)</option>
            <option value="teacher">teacher</option>
            <option value="student">student</option>
          </select>
        </div>
        {role === "teacher" ? (
          <>
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Grades (optional)
              </label>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                value={teacherGrades}
                onChange={(e) => setTeacherGrades(e.target.value)}
                placeholder="e.g. Grades 9–11"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Teaching topics (comma-separated, optional)
              </label>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                value={teacherTopics}
                onChange={(e) => setTeacherTopics(e.target.value)}
                placeholder="grammar, writing, …"
              />
            </div>
            <div>
              <div className="mb-1 flex items-end justify-between gap-2">
                <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Students
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setTeacherStudentRows((r) => [...r, newTeacherRow()])
                  }
                  className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Add row
                </button>
              </div>
              <div className="mt-1 overflow-x-auto rounded-md border border-zinc-300 dark:border-zinc-600">
                <table className="w-full min-w-[360px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-100 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                      <th className="w-8 px-2 py-2 font-medium">#</th>
                      <th className="px-2 py-2 font-medium">First name</th>
                      <th className="px-2 py-2 font-medium">Last name</th>
                      <th className="w-20 px-2 py-2 font-medium" aria-label="actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {teacherStudentRows.map((row, i) => (
                      <tr
                        key={row.id}
                        className="border-b border-zinc-200 last:border-0 dark:border-zinc-700"
                      >
                        <td className="px-2 py-1.5 align-middle text-zinc-500">
                          {i + 1}
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className="w-full min-w-0 rounded border-0 bg-transparent py-1 text-sm outline-none focus:ring-0 dark:bg-zinc-900/30"
                            value={row.firstName}
                            onChange={(e) => {
                              const v = e.target.value;
                              setTeacherStudentRows((list) =>
                                list.map((r) =>
                                  r.id === row.id
                                    ? { ...r, firstName: v }
                                    : r,
                                ),
                              );
                            }}
                            autoComplete="given-name"
                            placeholder="—"
                            aria-label={`Student ${i + 1} first name`}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            className="w-full min-w-0 rounded border-0 bg-transparent py-1 text-sm outline-none focus:ring-0 dark:bg-zinc-900/30"
                            value={row.lastName}
                            onChange={(e) => {
                              const v = e.target.value;
                              setTeacherStudentRows((list) =>
                                list.map((r) =>
                                  r.id === row.id
                                    ? { ...r, lastName: v }
                                    : r,
                                ),
                              );
                            }}
                            autoComplete="family-name"
                            placeholder="—"
                            aria-label={`Student ${i + 1} last name`}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setTeacherStudentRows((list) => {
                                const next = list.filter((x) => x.id !== row.id);
                                if (next.length === 0) {
                                  return [newTeacherRow()];
                                }
                                return next;
                              });
                            }}
                            className="text-xs text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-200"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Optional. Each row is one student; data is sent as one name per
                line. Saved to your account profile.
              </p>
            </div>
          </>
        ) : null}
        {role === "student" ? (
          <>
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Student — names
              </label>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                value={studentNames}
                onChange={(e) => setStudentNames(e.target.value)}
                placeholder="optional"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Student — grade
              </label>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                value={studentGrade}
                onChange={(e) => setStudentGrade(e.target.value)}
                placeholder="optional"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Student — problem topics (comma-separated)
              </label>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                value={studentProblemTopics}
                onChange={(e) => setStudentProblemTopics(e.target.value)}
              />
            </div>
          </>
        ) : null}
        {role !== "teacher" ? (
          <>
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                English level (CEFR)
              </label>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                value={englishLevel}
                onChange={(e) => setEnglishLevel(e.target.value)}
                placeholder="A2, B1, …"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Hobbies (comma-separated)
              </label>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                value={hobbies}
                onChange={(e) => setHobbies(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Education
              </label>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="optional"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Work / field
              </label>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                value={workField}
                onChange={(e) => setWorkField(e.target.value)}
                placeholder="optional"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Native language code
              </label>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
                value={nativeLanguage}
                onChange={(e) => setNativeLanguage(e.target.value)}
                placeholder="e.g. uk, en"
              />
            </div>
          </>
        ) : null}
        {error ? (
          <p className="whitespace-pre-wrap text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-zinc-900 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? "…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-zinc-500">
        Already have an account?{" "}
        <Link className="text-zinc-900 underline dark:text-zinc-100" href="/login">
          Log in
        </Link>
      </p>
    </main>
  );
}
