import { InputHTMLAttributes } from "react";

export default function InputText({ ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <>
      <input
        {...props}
        className="text-black text-md placeholder:text-sm text-center border-[0.2px] border-solid border-gray-300 shadow-[0_0_2px_rgba(0,0,0,0.10)] m-1 rounded-[7px] px-1 py-0.5 w-54 items-center"
      />
    </>
  );
}

