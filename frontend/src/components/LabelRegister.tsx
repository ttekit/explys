import { ReactNode } from "react";
import { cn } from "../lib/utils";

interface LabelRegisterProps {
  children: ReactNode;
  isRequired: boolean;
  className?: string;
}

export default function LabelRegister({
  children,
  isRequired,
  className,
}: LabelRegisterProps) {
  return (
    <div className={cn(className)}>
      <label className="w-full text-left text-base font-medium text-foreground">
        {children}
        {isRequired && (
          <span className="p-1 font-bold text-destructive">*</span>
        )}
      </label>
    </div>
  );
}
