export default function SelectRegister({ options, ...props }) {
  return (
    <>
      <select
        className="text-black text-md placeholder:text-sm text-center border-2 border-solid border-black m-1 rounded-[7px] px-1 py-0.5 w-54 items-center"
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
