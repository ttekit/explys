import { ReactNode } from "react";

interface LabelRegisterProps {
  children: ReactNode;
  isRequired: boolean;
}

export default function LabelRegister({
  children,
  isRequired,
}: LabelRegisterProps) {
  return (
    <>
      <div>
        <label className="text-gray-900 text-[16px] text-left w-full font-semibold">
          {children}
        </label>
        {isRequired && (
          <label className="text-(--error-bright) p-1 font-bold">*</label>
        )}
      </div>
    </>
  );
}
