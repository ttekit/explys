import { ReactNode, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

const styleClass: string =
  "w-full py-2 mt-3 bg-(--purple-default) hover:bg-(--purple-hover) hover:cursor-pointer text-white rounded-full font-bold text-lg shadow-lg shadow-purple-200 transition-all";

export default function Button({ children, ...props }: ButtonProps) {
  return (
    <>
      <button {...props} className={styleClass}>
        {children}
      </button>
    </>
  );
}
