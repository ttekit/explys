import { SelectHTMLAttributes } from "react";

interface Option {
  value: string;
  text: string;
}

interface SelectRegisterProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: Option[];
}

const styleClass: string =
  "w-full bg-(--white-background) border-1 border-gray-300 rounded-full px-4 py-2 shadow-[0_2px_4px_rgba(0,0,0,0.05)] transition-all duration-300 focus-within:outline-none focus-within:border-(--purple-default) focus-within:shadow-[0_0_15px_rgba(124,102,245,0.4)] flex items-center gap-2";

export default function SelectRegister({
  options,
  className,
  ...props
}: SelectRegisterProps) {
  return (
    <>
      <select
        className={[styleClass, className].filter(Boolean).join(" ")}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.text}
          </option>
        ))}
      </select>
    </>
  );
}
