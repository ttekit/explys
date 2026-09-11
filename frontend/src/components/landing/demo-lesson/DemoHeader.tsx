import { Link, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { useLandingLocale } from "../../../context/LandingLocaleContext";
import { cn } from "../../../lib/utils";

export type DemoMode = "quickTry" | "wholeLesson";

interface DemoProps {
  mode: DemoMode;
  onModeChange: (mode: DemoMode) => void;
}

export default function DemoHeader({ mode, onModeChange }: DemoProps) {
  const { messages } = useLandingLocale();
  const demo = messages.demoLessonPage;
  const navigate = useNavigate();

  const linkLanding =
    "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer";

  const handleTabClick = (tab: DemoMode | "createAccount") => {
    if (tab === "createAccount") {
      navigate("/register");
      return;
    }
    onModeChange(tab);
  };

  return (
    <>
      <header className="fixed z-999 grid grid-cols-3 h-18 w-full items-center border-b border-border bg-[--header-background] px-3 font-display backdrop-blur-md md:px-4">
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <Link to="/">
            <img
              src={`${import.meta.env.BASE_URL}Icon.svg`}
              alt="Explys Logo"
              className="h-15 w-16 shrink-0 object-contain hover:cursor-pointer"
            />
          </Link>

          <p className="hidden sm:block truncate text-2xl font-bold sm:text-3xl md:text-[35px] text-foreground">
            Explys
          </p>
        </div>
        <nav className="flex min-w-35 max-w-fit flex-nowrap items-center gap-1 overflow-x-auto rounded-full border border-border bg-background/50 px-2 py-1.5 shadow-sm backdrop-blur-md sm:gap-2 sm:px-3 scrollbar-hide">
          <div
            onClick={() => handleTabClick("quickTry")}
            className={cn(
              linkLanding,
              mode === "quickTry"
                ? "bg-secondary text-foreground shadow-sm"
                : "text-muted-foreground bg-secondary/20 hover:bg-secondary/60 hover:text-foreground",
            )}
            title={demo.quickTryContent.describtion}
          >
            {demo.quickTry}
          </div>
          <div
            onClick={() => handleTabClick("wholeLesson")}
            className={cn(
              linkLanding,
              mode === "wholeLesson"
                ? "bg-secondary text-foreground shadow-sm"
                : "text-muted-foreground bg-secondary/20 hover:bg-secondary/60 hover:text-foreground",
            )}
            title={demo.wholeLessonContent.describtion}
          >
            {demo.wholeLesson}
          </div>
          <div
            onClick={() => handleTabClick("createAccount")}
            className={cn(
              linkLanding,
              "text-muted-foreground bg-secondary/20 hover:bg-secondary/60 hover:text-foreground",
            )}
            title={demo.createDescription}
          >
            {demo.createAccount}
          </div>
        </nav>
        <Link to="/" className="text-[14px] justify-self-end">
          <div className="flex flex-row gap-1 justify-center items-center border-b-2 border-transparent hover:border-foreground/30 px-1 transition-all duration-400">
            <ArrowLeft className="size-6 md:size-4" />
            <p className="hidden md:block">{demo.returnBack}</p>
          </div>
        </Link>
      </header>
    </>
  );
}
