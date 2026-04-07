import { ReactNode, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export default function Button({ children, ...props }: ButtonProps) {
  return (
    <>
      <button
        {...props}
        className="bg-(--purple-default) text-white font-semibold rounded-[9px] px-5 cursor-pointer mx-1 hover:bg-(--purple-hover) transition duration-500 ease-in-out"
      >
        {children}
      </button>
    </>
  );
}
