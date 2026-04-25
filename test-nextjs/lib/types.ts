export type AuthUser = {
  id: number;
  email: string;
  name: string;
};

export type AuthSession = {
  access_token: string;
  user: AuthUser;
};

export type UserProfile = {
  id: number;
  name: string;
  email: string;
  /** From backend `users.role` (e.g. adult, teacher, student) */
  role?: string;
  hasCompletedPlacement?: boolean;
  createdAt?: string;
  additionalUserData?: {
    englishLevel?: string | null;
    nativeLanguage?: string | null;
    knownLanguages?: string[];
    knownLanguageLevels?: unknown;
    hobbies?: string[];
    education?: string | null;
    workField?: string | null;
    job?: string | null;
    interests?: string[] | null;
    teacherGrades?: string | null;
    teacherTopics?: string[] | null;
    studentNames?: string | null;
    studentGrade?: string | null;
    studentProblemTopics?: string[] | null;
    favoriteGenres?: { id: number; name: string }[];
    hatedGenres?: { id: number; name: string }[];
  } | null;
};

export type PlacementStatus = {
  hasCompletedPlacement: boolean;
  shouldShowEntryTest: boolean;
};
