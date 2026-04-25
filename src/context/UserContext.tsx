import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { apiUrl } from "../lib/api";

export interface UserData {
  id: string;
  name: string;
  email: string;
  englishLevel: string;
  hobbies: string[];
  education: string;
  workField: string;
  favoriteGenres: number[];
  hatedGenres: number[];
  avatarUrl?: string;
}

interface UserContextType {
  user: UserData | null;
  login: (data: UserData) => void;
  logout: () => void;
  isLoggedIn: boolean;
  isLoading: boolean;
}

export const UserContext = createContext<UserContextType | undefined>(
  undefined,
);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const login = (data: UserData) => {
    setUser(data);
    localStorage.setItem("app_user", JSON.stringify(data));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("app_user");
  };

  useEffect(() => {
    const getProfile = async () => {
      try {
        setIsLoading(true);

        const response = await fetch(apiUrl("/auth/profile"), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data);
          console.log(user);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Помилка завантаження профілю:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getProfile();
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
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
