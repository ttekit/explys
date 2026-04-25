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
        className={`flex items-center justify-between m-1 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
          isDone
            ? "bg-violet-50 text-(--purple-default)"
            : "bg-gray-50 text-gray-400 hover:bg-gray-100"
        }`}
        {...props}
      >
        <span>{children}</span>
        {isDone ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-(--purple-default)"
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
          <div className="w-4 h-4 rounded-full border-2 border-gray-200" />
        )}
      </div>
    </>
  );
}
