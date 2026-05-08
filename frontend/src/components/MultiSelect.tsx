import Select, {
  type GroupBase,
  type Props as SelectProps,
} from "react-select";

const selectClassNames = {
  control: ({ isFocused }: { isFocused: boolean }) =>
    `!min-h-[42px] !max-h-[100px] !overflow-y-auto !rounded-xl !border !px-3 !transition-all !duration-300 !flex !items-center !gap-2 ${
      isFocused
        ? "!border-ring !ring-[3px] !ring-ring/50 !outline-none"
        : "!border-border !bg-input"
    } `,
  placeholder: () => "!text-muted-foreground !ml-2",
  valueContainer: () =>
    "!flex !flex-wrap !gap-1 !max-h-[90px] !overflow-y-auto !py-1",
  input: () => "!text-foreground !ml-2",
  multiValue: () =>
    "!m-1 !flex !items-center !gap-1 !rounded-full !border !border-border !bg-muted !px-2 !py-0.5",
  multiValueLabel: () => "!px-1 !text-sm text-foreground",
  multiValueRemove: () =>
    "!cursor-pointer text-muted-foreground !rounded-full transition-colors hover:!bg-destructive/20 hover:!text-destructive",
  singleValue: () => "!text-foreground !ml-2",
  menu: () =>
    "!overflow-hidden rounded-xl mt-2 !border !border-border shadow-xl backdrop-blur",
  menuList: () => "!bg-card !py-1",
  option: ({
    isFocused,
    isSelected,
  }: {
    isFocused: boolean;
    isSelected: boolean;
  }) =>
    `!cursor-pointer !px-4 !py-2 ${
      isSelected
        ? "!bg-primary !text-primary-foreground"
        : isFocused
          ? "!bg-primary/15 !text-foreground"
          : "!bg-transparent !text-foreground"
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
