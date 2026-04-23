import Select, { type GroupBase, type Props as SelectProps } from "react-select";

const selectClassNames = {
  control: ({ isFocused }: { isFocused: boolean }) =>
    `!min-h-[42px] !max-h-[100px] !overflow-y-auto !rounded-[25px] !px-3 !bg-(--white-background) !border-1 !transition-all !duration-300 !flex !items-center !gap-2 !shadow-[0_2px_4px_rgba(0,0,0,0.05)] ${
      isFocused
        ? "!border-(--purple-default) !shadow-[0_0_15px_rgba(124,102,245,0.4)] !outline-none"
        : "!border-gray-300"
    } scrollbar-thin scrollbar-thumb-purple-200`,
  placeholder: () => "!text-gray-400 !ml-2",
  valueContainer: () =>
    "!flex !flex-wrap !gap-1 !max-h-[90px] !overflow-y-auto !py-1",
  input: () => "!ml-2",
  multiValue: () =>
    "!bg-(--gray-background) !rounded-full !px-2 !py-0.5 !flex !items-center !gap-1 !m-1 !border !border-gray-200",
  multiValueLabel: () => "!text-gray-700 !text-sm !px-1",
  multiValueRemove: () =>
    "!text-gray-400 hover:!bg-gray-200 hover:!text-red-500 !rounded-full !transition-colors !cursor-pointer",
  singleValue: () => "!ml-2 !text-gray-700",
  menu: () => "!rounded-2xl !mt-2 !shadow-xl !border-gray-100 !overflow-hidden",
  option: ({
    isFocused,
    isSelected,
  }: {
    isFocused: boolean;
    isSelected: boolean;
  }) =>
    `!px-4 !py-2 !cursor-pointer ${
      isSelected
        ? "!bg-(--purple-default) !text-white"
        : isFocused
          ? "!bg-purple-50 !text-(--purple-default)"
          : "!bg-white !text-gray-700"
    }`,
};

export default function MultiSelect<
  Option,
  IsMulti extends boolean = true,
  Group extends GroupBase<Option> = GroupBase<Option>,
>(props: SelectProps<Option, IsMulti, Group>) {
  return (
    <div>
      <Select unstyled classNames={selectClassNames} {...props} />
    </div>
  );
}
