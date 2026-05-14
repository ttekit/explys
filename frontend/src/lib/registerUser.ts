import type { FormData } from "../context/RegistrationContext";
import { apiFetch, readApiErrorBody } from "./api";
import { clearRegistrationDraft } from "./registrationStorage";

/** Mirrors backend `AuthService` `GeneratedStudent` when `role === "teacher"`. */
export type GeneratedStudentAccount = {
  name: string;
  email: string;
  password: string;
};

export type RegisterResult =
  | { success: true; generatedStudents?: GeneratedStudentAccount[] }
  | { success: false; message: string };

export type RegisterCredentialErrorMessages = {
  credentialEmail: string;
  credentialPassword: string;
  passwordsDontMatch: string;
};

/** Matches backend `@IsEmail` + `@MinLength(6)`; returns a user-facing error or `null`. */
export function getRegisterCredentialsError(
  formData: FormData,
  msgs: RegisterCredentialErrorMessages,
): string | null {
  const email = formData.email.trim().toLowerCase();

  const hasUpperCase = /[A-Z]/.test(email);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return msgs.credentialEmail;
  }

  if (hasUpperCase) {
    return "пошта повиина містити тыльки малі літери";
  }

  if (!formData.password || formData.password.length < 8) {
    return msgs.credentialPassword;
  }
  if (formData.password !== formData.confirmPassword) {
    return msgs.passwordsDontMatch;
  }
  return null;
}

const CHOOSE = "choose";

function cleanOptionalString(v: string | undefined): string | undefined {
  if (v == null || v === "" || v === CHOOSE) return undefined;
  return v;
}

/**
 * Body for `POST /auth/register` (matches backend `RegisterDto` / `AuthService`).
 * Does not send `confirmPassword`, placeholder "choose" values, or `studentNames: ""` (Prisma JSON).
 */
export function buildRegisterBody(formData: FormData): Record<string, unknown> {
  const isTeacher = formData.role === "teacher";
  const raw = formData.studentNames;
  const teacherPupils =
    isTeacher && Array.isArray(raw) ? raw : isTeacher ? [] : null;

  const body: Record<string, unknown> = {
    name: formData.name.trim(),
    email: formData.email.trim(),
    password: formData.password,
    passwordRepeat: formData.confirmPassword,
  };

  if (formData.role && formData.role !== CHOOSE) {
    body.role = formData.role;
  }

  if (isTeacher) {
    const grades = cleanOptionalString(formData.teacherGrades);
    if (grades !== undefined) {
      body.teacherGrades = grades;
    }
    body.teacherTopics = formData.teacherTopics ?? [];
    body.studentNames = teacherPupils
      ? teacherPupils.map((pupil: any) => {
          if (typeof pupil === "string") return pupil;

          return `${pupil.name} ${pupil.surname || ""}`.trim();
        })
      : [];
  }
  // else: do not send studentNames / teacher* — avoids `""` on a JSON column

  const el = cleanOptionalString(formData.englishLevel);
  if (el !== undefined) body.englishLevel = el;
  const ed = cleanOptionalString(formData.education);
  if (ed !== undefined) body.education = ed;
  const wf = cleanOptionalString(formData.workField);
  if (wf !== undefined) body.workField = wf;
  const sGrade = cleanOptionalString(formData.studentGrade);
  if (sGrade !== undefined) body.studentGrade = sGrade;

  body.hobbies = formData.hobbies?.length ? formData.hobbies : [];
  body.studentProblemTopics = formData.studentProblemTopics?.length
    ? formData.studentProblemTopics
    : [];

  body.favoriteGenres = isTeacher ? [] : (formData.favoriteGenres ?? []);
  body.hatedGenres = isTeacher ? [] : (formData.hatedGenres ?? []);

  if (formData.role === "adult") {
    const lg = formData.learningGoal?.trim();
    const ta = formData.timeToAchieve?.trim();
    if (lg) body.learningGoal = lg;
    if (ta) body.timeToAchieve = ta;
  }

  return body;
}

export async function registerUser(
  formData: FormData,
  credentialMsgs: RegisterCredentialErrorMessages,
  networkError: string,
): Promise<RegisterResult> {
  const creds = getRegisterCredentialsError(formData, credentialMsgs);
  if (creds) {
    return { success: false, message: creds };
  }
  const body = {
    ...buildRegisterBody(formData),
    isTwoFactorEnabled: false,
  };
  let response: Response;
  try {
    response = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch {
    return {
      success: false,
      message: networkError,
    };
  }

  if (response.ok) {
    clearRegistrationDraft();
    let generatedStudents: GeneratedStudentAccount[] | undefined;
    try {
      const data = (await response.json()) as {
        generatedStudents?: GeneratedStudentAccount[];
      };
      if (
        Array.isArray(data.generatedStudents) &&
        data.generatedStudents.length > 0
      ) {
        generatedStudents = data.generatedStudents;
      }
    } catch {
      // ignore body parse
    }
    return { success: true, generatedStudents };
  }
  return { success: false, message: await readApiErrorBody(response) };
}
