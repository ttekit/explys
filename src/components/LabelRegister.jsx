export default function LabelRegister({ children, isRequired }) {
  return (
    <>
      <div>
        <label className="text-gray-900 text-[14px] text-left w-full font-semibold">
          {children}
        </label>
        {isRequired && (
          <label className="text-(--error-bright) p-1 fonct-bold">*</label>
        )}
      </div>
    </>
  );
}
