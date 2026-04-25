"use client";

import { createContext, useState, type ReactNode } from "react";

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

interface RegistrationContextType {
  formData: FormData;
  updateFormData: (newData: Partial<FormData>) => void;
}

export const RegistrationContext = createContext<
  RegistrationContextType | undefined
>(undefined);

export const RegistrationProvider = ({ children }: { children: ReactNode }) => {
  const [formData, setFormData] = useState<FormData>({
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
  });

  const updateFormData = (newData: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  return (
    <RegistrationContext.Provider value={{ formData, updateFormData }}>
      {children}
    </RegistrationContext.Provider>
  );
};
