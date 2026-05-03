"use client";

import Button from "@/components/Button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  downloadAccountInfoExcel,
  downloadStudentAccountsDataFile,
  downloadStudentAccountsExcel,
} from "@/lib/studentAccountsExcel";
import type { GeneratedStudentAccount } from "@/lib/registerUser";
import {
  LEGACY_REGISTER_SUCCESS_STUDENTS_KEY,
  REGISTER_SUCCESS_KEY,
  type RegisterSuccessPayload,
} from "@/lib/registerUser";
import { downloadSignInReminderFile } from "@/lib/registrationReminders";

/**
 * Survives React 18 Strict Mode (dev) double effect: first read stashes and removes
 * from sessionStorage; second read returns this stash. Without it, the second effect
 * saw empty storage and hid every download button.
 */
let clientRegisterSuccessStash: RegisterSuccessPayload | null = null;

function readSuccessFromSession(): RegisterSuccessPayload {
  if (clientRegisterSuccessStash) {
    return clientRegisterSuccessStash;
  }
  if (typeof sessionStorage === "undefined") {
    return { students: [], name: "", email: "" };
  }
  let result: RegisterSuccessPayload | null = null;
  try {
    const raw = sessionStorage.getItem(REGISTER_SUCCESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") {
        const students = Array.isArray(parsed.students)
          ? (parsed.students as GeneratedStudentAccount[])
          : [];
        const name =
          typeof parsed.name === "string" ? parsed.name : String(parsed.name ?? "");
        const email =
          typeof parsed.email === "string" ? parsed.email : String(parsed.email ?? "");
        result = { students, name, email };
      }
    }
  } catch {
    result = null;
  }
  if (!result) {
    try {
      const leg = sessionStorage.getItem(LEGACY_REGISTER_SUCCESS_STUDENTS_KEY);
      if (leg) {
        const arr = JSON.parse(leg) as unknown;
        result = {
          students: Array.isArray(arr) ? (arr as GeneratedStudentAccount[]) : [],
          name: "",
          email: "",
        };
      }
    } catch {
      result = null;
    }
  }
  if (!result) {
    return { students: [], name: "", email: "" };
  }
  try {
    sessionStorage.removeItem(REGISTER_SUCCESS_KEY);
    sessionStorage.removeItem(LEGACY_REGISTER_SUCCESS_STUDENTS_KEY);
  } catch {
    // ignore
  }
  clientRegisterSuccessStash = result;
  return result;
}

function clearRegisterSuccessStash() {
  clientRegisterSuccessStash = null;
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(REGISTER_SUCCESS_KEY);
    sessionStorage.removeItem(LEGACY_REGISTER_SUCCESS_STUDENTS_KEY);
  } catch {
    // ignore
  }
}

export default function RegisterSuccessPage() {
  const router = useRouter();
  const [payload, setPayload] = useState<RegisterSuccessPayload | null>(null);

  useEffect(() => {
    setPayload(readSuccessFromSession());
  }, []);

  if (payload === null) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  const { students, name, email } = payload;
  const hasStudents = students.length > 0;
  const canDownloadReminder = Boolean(name.trim() && email.trim());

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-[40px] bg-(--gray-background) p-8 shadow-[0_20px_20px_rgba(0,0,0,0.1)]">
        <div className="mb-2 text-4xl" aria-hidden>
          ✓
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Registration successful
        </h1>
        <p className="mt-2 text-gray-600">
          {hasStudents
            ? "Your teacher account is ready. Student logins were created for the pupils you listed. Download the Excel or CSV file to share credentials securely (store it in a safe place—anyone with the file can sign in as those students)."
            : "Your account is ready. You can sign in with the email and password you chose."}
        </p>

        {canDownloadReminder && !hasStudents && (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <Button
                type="button"
                className="!mt-0 flex-1"
                onClick={() => void downloadAccountInfoExcel({ name, email }, "my-account")}
              >
                Download Excel file
              </Button>
              <p className="text-center text-xs text-gray-500 sm:text-left">
                Saves as <span className="font-mono">my-account.xlsx</span> (name
                &amp; email, no password in the file)
              </p>
            </div>
            <Button
              type="button"
              className="!mt-0 flex-1 !border !border-gray-300 !bg-white !text-gray-800 !shadow-none hover:!bg-gray-100 hover:!text-gray-900 sm:max-w-[10rem] sm:self-start"
              onClick={() => downloadSignInReminderFile(name, email)}
            >
              Download .txt
            </Button>
          </div>
        )}

        {hasStudents && (
          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-gray-800">
              Student accounts ({students.length})
            </p>
            <div className="max-h-48 overflow-auto rounded-2xl border border-gray-200 bg-white/80 text-sm">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Password</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr
                      key={s.email}
                      className="border-t border-gray-100 text-gray-800"
                    >
                      <td className="px-3 py-2">{s.name}</td>
                      <td className="px-3 py-2 break-all">{s.email}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {s.password}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="!mt-6 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
              <div className="flex flex-1 flex-col gap-1">
                <Button
                  type="button"
                  className="!mt-0 flex-1"
                  onClick={() =>
                    void downloadStudentAccountsExcel(
                      students,
                      "student-accounts",
                    )
                  }
                >
                  Download Excel file
                </Button>
                <p className="text-center text-xs text-gray-500 sm:text-left">
                  Saves as <span className="font-mono">student-accounts.xlsx</span>
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <Button
                  type="button"
                  className="!mt-0 flex-1 !border !border-gray-300 !bg-white !text-gray-800 !shadow-none hover:!bg-gray-100 hover:!text-gray-900"
                  onClick={() =>
                    downloadStudentAccountsDataFile(students, "students-data")
                  }
                >
                  Download CSV file
                </Button>
                <p className="text-center text-xs text-gray-500 sm:text-left">
                  <span className="font-mono">students-data.csv</span>
                </p>
              </div>
            </div>

            {canDownloadReminder && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <Button
                  type="button"
                  className="!mt-0 !border !border-gray-300 !bg-white !text-gray-800 !shadow-none hover:!bg-gray-100 hover:!text-gray-900"
                  onClick={() => downloadSignInReminderFile(name, email)}
                >
                  Download your account (txt)
                </Button>
                <p className="mt-1 text-center text-xs text-gray-500 sm:text-left">
                  Your teacher name &amp; email for your own records
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-2">
          <Button
            type="button"
            onClick={() => {
              clearRegisterSuccessStash();
              router.push("/login");
            }}
          >
            Go to sign in
          </Button>
          <Link
            className="w-full text-center text-sm text-(--purple-default) font-semibold hover:underline"
            href="/"
            onClick={() => clearRegisterSuccessStash()}
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
