import { cn } from "../../lib/utils";
import { useLandingLocale } from "../../context/LandingLocaleContext";

type LandingLanguageToggleProps = {
  className?: string;
};

export function LandingLanguageToggle({ className }: LandingLanguageToggleProps) {
  const { locale, setLocale, messages } = useLandingLocale();

  return (
    <div
      className={cn(
        "flex shrink-0 items-center rounded-full border border-border bg-muted/30 p-0.5",
        className,
      )}
      role="group"
      aria-label={messages.common.languageToggleAria}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={cn(
          "rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 sm:text-sm",
          locale === "en"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("uk")}
        className={cn(
          "rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors sm:px-3 sm:text-sm",
          locale === "uk"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        UA
      </button>
    </div>
  );
}
