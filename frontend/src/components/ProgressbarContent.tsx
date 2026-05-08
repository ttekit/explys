import { HTMLAttributes, ReactNode } from "react";

interface ProgressbarContent extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  isDone: boolean;
}

export default function ProgressbarContent({
  children,
  isDone = false,
  ...props
}: ProgressbarContent) {
  return (
    <>
      <div className="flex flex-1 flex-col" {...props}>
        <div
          className={`mb-1.5 h-2 w-full overflow-hidden rounded-full ease-in-out duration-500 ${isDone ? "bg-(--purple-default)" : "bg-zinc-700"
            }`}
        ></div>
        <span className="text-xs text-zinc-500">{children}</span>
      </div>
    </>
  );
}
