export default function LabelRegister({ children, className }) {
  return (
    <>
      <label className="text-gray-900 text-[14px] text-left w-full font-semibold">
        {children}
      </label>
    </>
  );
}
