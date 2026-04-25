/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, ReactNode } from "react";

export interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  englishLevel: string;
  hobbies: string;
  education: string;
  workField: string;
  favoriteGenres: string;
  hatedGenres: string;
}

interface RegistrationContextType {
  formData: FormData;
  updateFormData: (newData: Partial<FormData>) => void;
}

export const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

interface RegistrationProviderProps {
  children: ReactNode;
}

export const RegistrationProvider = ({ children }: RegistrationProviderProps) => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    englishLevel: "choose",
    hobbies: "",
    education: "choose",
    workField: "choose",
    favoriteGenres: "",
    hatedGenres: "",
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

