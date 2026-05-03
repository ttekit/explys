import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { apiFetch, setStoredAccessToken } from "../lib/api";

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  hasCompletedPlacement: boolean;
  englishLevel: string;
  hobbies: string[];
  education: string;
  workField: string;
  favoriteGenres: number[];
  hatedGenres: number[];
  avatarUrl?: string;
}

function normalizeProfile(raw: unknown): UserData | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    id: String(r.id ?? ""),
    name: String(r.name ?? ""),
    email: String(r.email ?? ""),
    role: String(r.role ?? "adult"),
    hasCompletedPlacement: Boolean(r.hasCompletedPlacement),
    englishLevel: String(r.englishLevel ?? ""),
    education: String(r.education ?? ""),
    workField: String(r.workField ?? ""),
    hobbies: Array.isArray(r.hobbies) ? (r.hobbies as string[]) : [],
    favoriteGenres: Array.isArray(r.favoriteGenres)
      ? (r.favoriteGenres as number[])
      : [],
    hatedGenres: Array.isArray(r.hatedGenres)
      ? (r.hatedGenres as number[])
      : [],
    avatarUrl: typeof r.avatarUrl === "string" ? r.avatarUrl : undefined,
  };
}

interface UserContextType {
  user: UserData | null;
  login: (data: UserData) => void;
  logout: () => void;
  refreshProfile: () => Promise<UserData | null>;
  isLoggedIn: boolean;
  isLoading: boolean;
}

export const UserContext = createContext<UserContextType | undefined>(
  undefined,
);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async (): Promise<UserData | null> => {
    const response = await apiFetch("/auth/profile", { method: "GET" });
    if (!response.ok) {
      setUser(null);
      return null;
    }
    const data: unknown = await response.json();
    const next = normalizeProfile(data);
    setUser(next);
    return next;
  }, []);

  const login = (data: UserData) => {
    setUser(data);
  };

  const logout = useCallback(() => {
    setUser(null);
    setStoredAccessToken(null);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        await refreshProfile();
      } catch (error) {
        console.error("Profile load failed:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [refreshProfile]);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        refreshProfile,
        isLoggedIn: !!user,
        isLoading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
