import type { ReactNode } from "react";
import { cn } from "../lib/utils";
//import { EmailVerificationBanner } from "./EmailVerificationBanner";

export interface AuthSplitLayoutProps {
  children: ReactNode;
  rightTitle: string;
  rightSubtitle: string;
  /** 1-based step for progress dots */
  progressStep?: number;
  progressTotal?: number;
  /** Widen left column beyond default `max-w-md` when needed */
  mainClassName?: string;
  rightImage?: string;
  rightImageClassName?: string;
}

export function AuthSplitLayout({
  children,
  rightTitle,
  rightSubtitle,
  progressStep,
  progressTotal = 3,
  mainClassName,
  rightImage,
  rightImageClassName,
}: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col font-display bg-background text-foreground">
      {/* <EmailVerificationBanner /> */}

      <div className="flex flex-1">
        <div className="flex w-full lg:w-1/2 shrink-0 items-center justify-center p-8">
          <div className={cn("w-full max-w-md", mainClassName)}>{children}</div>
        </div>

        <div className="relative hidden lg:flex lg:w-1/2 shrink-0 bg-card items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.65_0.25_295/0.2)_0%,transparent_70%)]" />
          <div className="relative px-12 text-center">
            <img
              src={rightImage || `${import.meta.env.BASE_URL}Greeting.svg`}
              className={
                rightImageClassName || "w-45 h-54 animate-float ml-25 my-5"
              }
              alt="Greeting Chameleon"
            />
            <h2 className="text-2xl font-bold font-display mb-4">
              {rightTitle}
            </h2>
            <p className="text-muted-foreground mx-auto max-w-sm">
              {rightSubtitle}
            </p>

            {progressStep != null && (
              <div className="mt-8 flex items-center justify-center gap-3">
                {Array.from({ length: progressTotal }, (_, i) => i + 1).map(
                  (s) => (
                    <div
                      key={s}
                      className={cn(
                        "size-2 rounded-full transition-all duration-300",
                        s === progressStep
                          ? "bg-primary scale-125 shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                          : s < progressStep
                            ? "bg-primary/40"
                            : "bg-white/20",
                      )}
                    />
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
