import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LANDING_LOCALES,
  type LandingLocaleId,
  type LandingMessages,
} from "../locales/landing";

const STORAGE_KEY = "explys-landing-locale";

function readStoredLocale(): LandingLocaleId {
  if (typeof window === "undefined") return "en";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "en" || raw === "uk") return raw;
  } catch {
    /* ignore */
  }
  if (typeof navigator !== "undefined") {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith("uk")) return "uk";
  }
  return "en";
}

type LandingLocaleContextValue = {
  locale: LandingLocaleId;
  setLocale: (id: LandingLocaleId) => void;
  messages: LandingMessages;
};

const LandingLocaleContext = createContext<LandingLocaleContextValue | null>(
  null,
);

export function LandingLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LandingLocaleId>(() =>
    readStoredLocale(),
  );

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale === "uk" ? "uk" : "en";
  }, [locale]);

  const setLocale = useCallback((id: LandingLocaleId) => {
    setLocaleState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      messages: LANDING_LOCALES[locale],
    }),
    [locale, setLocale],
  );

  return (
    <LandingLocaleContext.Provider value={value}>
      {children}
    </LandingLocaleContext.Provider>
  );
}

export function useLandingLocale(): LandingLocaleContextValue {
  const ctx = useContext(LandingLocaleContext);
  if (!ctx) {
    throw new Error(
      "useLandingLocale must be used within LandingLocaleProvider",
    );
  }
  return ctx;
}
