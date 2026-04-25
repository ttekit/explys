import type { TeacherStudentRow } from "./teacher-roster.types";

/** Matches backend RegisterStudentAccountDto / main register password rules */
export type PupilAccountPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

function slugifyForLogin(s: string): string {
  const t = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
  return t || "user";
}

/** Password with ≥8 chars, at least one upper, one lower, one digit (matches Nest `RegisterDto`) */
function randomCompliantPassword(): string {
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digit = "23456789";
  const rest = lower + upper + digit + "!@#%*";
  const out: string[] = [
    lower[Math.floor(Math.random() * lower.length)]!,
    upper[Math.floor(Math.random() * upper.length)]!,
    digit[Math.floor(Math.random() * digit.length)]!,
  ];
  for (let i = 0; i < 11; i++) {
    out.push(rest[Math.floor(Math.random() * rest.length)]!);
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = out[i]!;
    out[i] = out[j]!;
    out[j] = a;
  }
  return out.join("");
}

function makeStudentEmail(
  r: TeacherStudentRow,
  index: number,
  used: Set<string>,
): string {
  const a = slugifyForLogin(r.firstName);
  const b = slugifyForLogin(r.lastName);
  let base = a && b ? `${a}.${b}` : a || b || `student${index + 1}`;
  let email = `${base}@class.local`.toLowerCase();
  let n = 0;
  while (used.has(email)) {
    n += 1;
    email = `${base}.${n}@class.local`.toLowerCase();
  }
  used.add(email);
  return email;
}

/**
 * One entry per non-empty table row, with the same email/password the CSV and API use.
 */
export function buildPupilCredentialsList(
  rows: TeacherStudentRow[],
  /**
   * Reserve emails so generated pupil emails never match the teacher’s login.
   */
  teacherEmail: string,
): PupilAccountPayload[] {
  const used = new Set<string>();
  const t = (teacherEmail || "").trim().toLowerCase();
  if (t) {
    used.add(t);
  }
  const out: PupilAccountPayload[] = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const fn = (r.firstName || "").trim();
    const ln = (r.lastName || "").trim();
    if (!fn && !ln) {
      continue;
    }
    out.push({
      firstName: fn,
      lastName: ln,
      email: makeStudentEmail(r, i, used),
      password: randomCompliantPassword(),
    });
  }
  return out;
}

export function buildTeacherCredentialsRowsForCsv(
  params: {
    teacherName: string;
    teacherEmail: string;
    teacherPassword: string;
    pupils: PupilAccountPayload[];
  },
  escapeCsvField: (v: string) => string,
  joinLine: (cells: string[]) => string,
): string[] {
  const { teacherName, teacherEmail, teacherPassword, pupils } = params;
  const header = ["Firstname Lastname", "Login", "Password"].map(escapeCsvField);
  const lines: string[] = [header.join(",")];
  const tName = (teacherName || "").trim() || "Teacher";
  lines.push(
    joinLine([
      escapeCsvField(tName),
      escapeCsvField((teacherEmail || "").trim()),
      escapeCsvField(teacherPassword),
    ]),
  );
  for (const p of pupils) {
    const name = p.lastName
      ? `${p.firstName} ${p.lastName}`.trim()
      : p.firstName;
    lines.push(
      joinLine([
        escapeCsvField(name),
        escapeCsvField(p.email),
        escapeCsvField(p.password),
      ]),
    );
  }
  return lines;
}
