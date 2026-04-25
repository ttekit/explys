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
          className={`w-full h-2 ${isDone ? " bg-(--purple-default)" : " bg-gray-100"} rounded-full ease-in-out duration-500 overflow-hidden mb-1.5`}
        ></div>
        <span className="text-xs text-gray-400">{children}</span>
      </div>
    </>
  );
}
