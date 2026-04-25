import type { GeneratedStudentAccount } from "./registerUser";

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
