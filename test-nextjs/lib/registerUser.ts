import type { FormData } from "@/context/RegistrationContext";
import { apiFetch, readApiErrorBody } from "./api";

export type GeneratedStudentAccount = {
  name: string;
  email: string;
  password: string;
};

type RegisterResponseJson = {
  generatedStudents?: GeneratedStudentAccount[];
  access_token?: string;
  user?: unknown;
};

export type RegisterResult =
  | { success: true; generatedStudents?: GeneratedStudentAccount[] }
  | { success: false; message: string };

/** Set after a successful register; read by /register/success. */
export const REGISTER_SUCCESS_KEY = "eng_register_success";

/** @deprecated read only for migration; new flow uses REGISTER_SUCCESS_KEY */
export const LEGACY_REGISTER_SUCCESS_STUDENTS_KEY = "eng_register_success_students";

export type RegisterSuccessPayload = {
  students: GeneratedStudentAccount[];
  name: string;
  email: string;
};

export function storeRegisterSuccess(payload: {
  generatedStudents?: GeneratedStudentAccount[];
  name: string;
  email: string;
}) {
  if (typeof sessionStorage === "undefined") return;
  const body: RegisterSuccessPayload = {
    students: payload.generatedStudents ?? [],
    name: payload.name.trim(),
    email: payload.email.trim(),
  };
  sessionStorage.setItem(REGISTER_SUCCESS_KEY, JSON.stringify(body));
}

const CHOOSE = "choose";

function cleanOptionalString(v: string | undefined): string | undefined {
  if (v == null || v === "" || v === CHOOSE) return undefined;
  return v;
}

export function buildRegisterBody(
  formData: FormData,
): Record<string, unknown> {
  const isTeacher = formData.role === "teacher";
  const raw = formData.studentNames;
  const teacherPupils =
    isTeacher && Array.isArray(raw) ? raw : isTeacher ? [] : null;

  const body: Record<string, unknown> = {
    name: formData.name.trim(),
    email: formData.email.trim(),
    password: formData.password,
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
    body.studentNames = teacherPupils;
  }

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

  return body;
}

export async function registerUser(formData: FormData): Promise<RegisterResult> {
  const body = buildRegisterBody(formData);
  let response: Response;
  try {
    response = await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  } catch {
    return {
      success: false,
      message: "Network error. Please check if your backend server is running.",
    };
  }

  if (response.ok) {
    let data: RegisterResponseJson = {};
    try {
      data = (await response.json()) as RegisterResponseJson;
    } catch {
      // empty body
    }
    return {
      success: true,
      generatedStudents: data.generatedStudents,
    };
  }
  return { success: false, message: await readApiErrorBody(response) };
}
