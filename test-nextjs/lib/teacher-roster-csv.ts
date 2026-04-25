import {
  buildTeacherCredentialsRowsForCsv,
} from "./teacher-student-accounts";
import type { PupilAccountPayload } from "./teacher-student-accounts";

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Produces a UTF-8 CSV (Excel-friendly) with BOM. Columns: name, login, password.
 * Header: Firstname Lastname, Login, Password
 * Uses the same pupil credentials as `buildPupilCredentialsList` for API registration.
 */
export function buildTeacherCredentialsSheetCsv(params: {
  teacherName: string;
  teacherEmail: string;
  teacherPassword: string;
  /** Same list sent as `studentAccounts` on register — do not rebuild here or passwords in the file will not match the API. */
  pupils: PupilAccountPayload[];
}): string {
  const { teacherName, teacherEmail, teacherPassword, pupils } = params;
  const lines = buildTeacherCredentialsRowsForCsv(
    { teacherName, teacherEmail, teacherPassword, pupils },
    escapeCsvField,
    (cells) => cells.join(","),
  );
  return lines.join("\r\n");
}

export { buildPupilCredentialsList } from "./teacher-student-accounts";

export function downloadTextFile(
  filename: string,
  text: string,
  mime: string = "text/csv;charset=utf-8",
): void {
  const blob = new Blob(["\uFEFF" + text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.click();
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}
