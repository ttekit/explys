import { type ReactNode, type HTMLAttributes } from "react";

interface ValidateErrorProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export default function ValidateError({ children }: ValidateErrorProps) {
  return (
    <div className="bg-(--error-transparent) border-solid border-(--error-bright) border-[0.5px] rounded-full w-full text-3md text-(--error-bright) px-2 py-1 mt-1">
      {children}
    </div>
  );
}
