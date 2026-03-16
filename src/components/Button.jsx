export default function Button({ children, className, ...props }) {
  return (
    <>
      <button
        {...props}
        className="bg-black text-white font-semibold rounded-[9px] px-5 cursor-pointer mx-1"
      >
        {children}
      </button>
    </>
  );
}
