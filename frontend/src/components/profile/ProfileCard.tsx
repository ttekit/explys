import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

export function ProfileCard({
  title,
  action,
  children,
  className,
  contentClassName,
  noPadding,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  noPadding?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card/50 shadow-sm",
        className,
      )}
    >
      {(title !== undefined && title !== null && title !== "") || action ? (
        <div className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-3">
          {title !== undefined && title !== null && title !== "" ? (
            <h3 className="font-display text-lg font-semibold text-foreground">
              {title}
            </h3>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      <div className={cn(!noPadding && "p-4", contentClassName)}>{children}</div>
    </div>
  );
}
