import { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "../lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

const baseClass =
  "mt-3 inline-flex w-full cursor-pointer items-center justify-center rounded-xl px-4 py-2.5 text-lg font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0";

export default function Button({
  children,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        baseClass,
        "bg-primary text-primary-foreground hover:bg-primary/90",
        className,
      )}
    >
      {children}
    </button>
  );
}
