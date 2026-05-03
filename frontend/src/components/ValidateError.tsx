import { ReactNode, HTMLAttributes } from "react";
import { cn } from "../lib/utils";

interface ValidateErrorProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export default function ValidateError({
  children,
  className,
  ...props
}: ValidateErrorProps) {
  return (
    <div
      {...props}
      className={cn(
        "mt-2 w-full rounded-lg border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive",
        className,
      )}
    >
      {children}
    </div>
  );
}
