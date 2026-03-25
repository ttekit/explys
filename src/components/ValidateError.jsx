export default function ValidateError({ children, isVisible, ...props }) {
  return (
    <>
      <div
        className="bg-(--error-transparent) border-solid border-(--error-bright) border-[0.5px] rounded-[10px] w-full text-sm
     text-(--error-bright) px-2 py-1 mt-1"
      >
        {children}
      </div>
    </>
  );
}
