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
  } | null;
};

export type PlacementStatus = {
  hasCompletedPlacement: boolean;
  shouldShowEntryTest: boolean;
};
