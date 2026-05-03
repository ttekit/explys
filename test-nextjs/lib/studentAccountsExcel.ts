import type { GeneratedStudentAccount } from "./registerUser";
import { downloadTextFile } from "./teacher-roster-csv";

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * UTF-8 CSV with BOM, Excel-friendly. Columns: Name, Email, Password.
 */
export function downloadStudentAccountsDataFile(
  students: GeneratedStudentAccount[],
  fileBase = "students-data",
) {
  if (students.length === 0) return;
  const lines = [
    "Name,Email,Password",
    ...students.map((s) =>
      [s.name, s.email, s.password].map(escapeCsvField).join(","),
    ),
  ];
  const safe = fileBase.replace(/[^a-zA-Z0-9-_]/g, "-");
  downloadTextFile(`${safe}.csv`, lines.join("\r\n"));
}

export async function downloadStudentAccountsExcel(
  students: GeneratedStudentAccount[],
  fileBase = "student-accounts",
) {
  if (students.length === 0) return;
  const XLSX = await import("xlsx");
  const rows = students.map((s) => ({
    Name: s.name,
    Email: s.email,
    Password: s.password,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Students");
  const safe = fileBase.replace(/[^a-zA-Z0-9-_]/g, "-");
  XLSX.writeFile(wb, `${safe}.xlsx`);
}

/** Single user row after sign-up (no password in the file). */
export async function downloadAccountInfoExcel(
  data: { name: string; email: string },
  fileBase = "my-account",
) {
  const name = data.name?.trim() ?? "";
  const email = data.email?.trim() ?? "";
  if (!name && !email) return;
  const XLSX = await import("xlsx");
  const rows = [
    {
      Name: name,
      Email: email,
      Note: "Use the password you set at registration to sign in.",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Account");
  const safe = fileBase.replace(/[^a-zA-Z0-9-_]/g, "-");
  XLSX.writeFile(wb, `${safe}.xlsx`);
}
