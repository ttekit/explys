import { cn } from "../../lib/utils";

export function ToggleSwitch({
  checked,
  onCheckedChange,
  id,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-11 shrink-0 cursor-pointer rounded-full border border-border transition-colors",
        checked ? "bg-primary" : "bg-secondary",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-6 w-6 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[1.35rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
