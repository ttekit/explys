import { HTMLAttributes, ReactNode } from "react";

interface TestLabelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  isDone: boolean;
}

export default function TestLabel({
  children,
  isDone = false,
  ...props
}: TestLabelProps) {
  return (
    <>
      <div
        className={`m-1 flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${isDone
            ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
            : "border-zinc-700/60 bg-zinc-800/60 text-zinc-500 hover:border-zinc-600 hover:bg-zinc-800/90 hover:text-zinc-300"
          }`}
        {...props}
      >
        <span>{children}</span>
        {isDone ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-violet-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        ) : (
          <div className="h-4 w-4 rounded-full border-2 border-zinc-600" />
        )}
      </div>
    </>
  );
}
