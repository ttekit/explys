import type { ReactNode } from "react";
import { ChameleonMascot } from "./ChameleonMascot";
import { cn } from "../lib/utils";

type MascotMood = "happy" | "thinking" | "excited" | "waving";

export interface AuthSplitLayoutProps {
  children: ReactNode;
  rightTitle: string;
  rightSubtitle: string;
  rightMascotMood?: MascotMood;
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
  rightMascotMood = "waving",
  progressStep,
  progressTotal = 3,
  mainClassName,
}: AuthSplitLayoutProps) {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className={cn("w-full max-w-md", mainClassName)}>{children}</div>
      </div>
      <div className="relative hidden lg:flex flex-1 bg-card items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_oklch(0.65_0.25_295_/_0.2)_0%,_transparent_70%)]" />
        <div className="relative px-12 text-center">
          <ChameleonMascot
            size="xl"
            mood={rightMascotMood}
            className="mx-auto mb-8 scale-150"
          />
          <h2 className="text-2xl font-bold font-display mb-4">{rightTitle}</h2>
          <p className="text-muted-foreground mx-auto max-w-sm">{rightSubtitle}</p>
          {progressStep != null && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {Array.from({ length: progressTotal }, (_, i) => i + 1).map((s) => (
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
