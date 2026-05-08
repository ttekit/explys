import { SelectHTMLAttributes } from "react";
import { cn } from "../lib/utils";

interface Option {
  value: string;
  text: string;
}

interface SelectRegisterProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: Option[];
}

const fieldClass =
  "w-full cursor-pointer rounded-lg border border-border bg-input px-3 py-2.5 text-base text-foreground shadow-xs outline-none transition-colors focus:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60";

export default function SelectRegister({
  options,
  className,
  ...props
}: SelectRegisterProps) {
  return (
    <select className={cn(fieldClass, className)} {...props}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.text}
        </option>
      ))}
    </select>
  );
}
