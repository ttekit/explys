import { InputHTMLAttributes } from "react";
import { cn } from "../lib/utils";

const fieldClass =
  "w-full rounded-lg border border-border bg-input px-3 py-2.5 text-base text-foreground shadow-xs transition-colors placeholder:text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export default function InputText({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldClass, className)} />;
}
