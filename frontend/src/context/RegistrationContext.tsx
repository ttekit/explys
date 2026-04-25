/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, ReactNode } from "react";
import {
  readRegistrationDraft,
  writeRegistrationDraft,
} from "../lib/registrationStorage";

export { clearRegistrationDraft } from "../lib/registrationStorage";

/** For teachers, list of class pupils; otherwise unused. */
export type RegisterStudentNameRow = { name: string; surname: string };

export interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  teacherGrades: string;
  teacherTopics: string[];
  studentNames: RegisterStudentNameRow[] | string;
  studentGrade: string;
  studentProblemTopics: string[];
  englishLevel: string;
  hobbies: string[];
  education: string;
  workField: string;
  favoriteGenres: number[];
  hatedGenres: number[];
}

const defaultFormData: FormData = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "choose",
  teacherGrades: "choose",
  teacherTopics: [],
  studentNames: "",
  studentGrade: "choose",
  studentProblemTopics: [],
  englishLevel: "choose",
  hobbies: [],
  education: "choose",
  workField: "choose",
  favoriteGenres: [],
  hatedGenres: [],
};

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function mergeDraft(draft: unknown): FormData {
  if (!isRecord(draft)) {
    return { ...defaultFormData };
  }
  const d = draft;
  const asNumberArray = (v: unknown) =>
    Array.isArray(v) && v.every((x) => typeof x === "number")
      ? (v as number[])
      : [];
  const asStringArray = (v: unknown) =>
    Array.isArray(v) && v.every((x) => typeof x === "string")
      ? (v as string[])
      : [];
  const normalizeHobbies = (v: unknown) =>
    Array.isArray(v) && v.every((x) => typeof x === "string")
      ? (v as string[])
      : defaultFormData.hobbies;
  const pupils = d.studentNames;
  const studentNames: FormData["studentNames"] =
    Array.isArray(pupils) &&
    pupils.every(
      (p) =>
        p &&
        typeof p === "object" &&
        "name" in p &&
        "surname" in p,
    )
      ? (pupils as RegisterStudentNameRow[])
      : typeof d.studentNames === "string" || d.studentNames === undefined
        ? (d.studentNames as string) ?? defaultFormData.studentNames
        : defaultFormData.studentNames;

  return {
    name: typeof d.name === "string" ? d.name : defaultFormData.name,
    email: typeof d.email === "string" ? d.email : defaultFormData.email,
    password:
      typeof d.password === "string" ? d.password : defaultFormData.password,
    confirmPassword:
      typeof d.confirmPassword === "string"
        ? d.confirmPassword
        : defaultFormData.confirmPassword,
    role: typeof d.role === "string" ? d.role : defaultFormData.role,
    teacherGrades:
      typeof d.teacherGrades === "string"
        ? d.teacherGrades
        : defaultFormData.teacherGrades,
    teacherTopics: asStringArray(d.teacherTopics),
    studentNames,
    studentGrade:
      typeof d.studentGrade === "string"
        ? d.studentGrade
        : defaultFormData.studentGrade,
    studentProblemTopics: asStringArray(d.studentProblemTopics),
    englishLevel:
      typeof d.englishLevel === "string"
        ? d.englishLevel
        : defaultFormData.englishLevel,
    hobbies: normalizeHobbies(d.hobbies),
    education:
      typeof d.education === "string" ? d.education : defaultFormData.education,
    workField:
      typeof d.workField === "string" ? d.workField : defaultFormData.workField,
    favoriteGenres: asNumberArray(d.favoriteGenres),
    hatedGenres: asNumberArray(d.hatedGenres),
  };
}

function initialFormData(): FormData {
  const raw = readRegistrationDraft();
  return mergeDraft(raw);
}

interface RegistrationContextType {
  formData: FormData;
  updateFormData: (newData: Partial<FormData>) => void;
}

export const RegistrationContext = createContext<
  RegistrationContextType | undefined
>(undefined);

interface RegistrationProviderProps {
  children: ReactNode;
}

export const RegistrationProvider = ({
  children,
}: RegistrationProviderProps) => {
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const updateFormData = (newData: Partial<FormData>) => {
    setFormData((prev) => {
      const next = { ...prev, ...newData };
      writeRegistrationDraft(next);
      return next;
    });
  };

  return (
    <RegistrationContext.Provider value={{ formData, updateFormData }}>
      {children}
    </RegistrationContext.Provider>
  );
};
