import type { ReactNode } from "react";
import { cn } from "../lib/utils";

export interface AuthSplitLayoutProps {
  children: ReactNode;
  rightTitle: string;
  rightSubtitle: string;
  /** 1-based step for progress dots */
  progressStep?: number;
  progressTotal?: number;
  /** Widen left column beyond default `max-w-md` when needed */
  mainClassName?: string;
}

export function AuthSplitLayout({
  children,
  rightTitle,
  rightSubtitle,
  progressStep,
  progressTotal = 3,
  mainClassName,
}: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen flex font-display bg-background text-foreground">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className={cn("w-full max-w-md", mainClassName)}>{children}</div>
      </div>
      <div className="relative hidden lg:flex flex-1 bg-card items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,oklch(0.65_0.25_295/0.2)_0%,transparent_70%)]" />
        <div className="relative px-12 text-center">
          <img src="/Icon.svg" className="w-45 h-54 animate-float ml-25 my-5" />
          <h2 className="text-2xl font-bold font-display mb-4">{rightTitle}</h2>
          <p className="text-muted-foreground mx-auto max-w-sm">
            {rightSubtitle}
          </p>
          {progressStep != null && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {Array.from({ length: progressTotal }, (_, i) => i + 1).map(
                (s) => (
                  <div
                    key={s}
                    className={`size-2 rounded-full transition-colors ${
                      s === progressStep
                        ? "bg-primary"
                        : s < progressStep
                          ? "bg-primary/50"
                          : "bg-muted"
                    }`}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
