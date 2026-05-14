/**
 * Numeric amount + day/month/year selector; emits canonical English `timeToAchieve` strings.
 */
import { useEffect, useState } from "react";
import { cn } from "../lib/utils";
import {
  parseTimeToAchieveString,
  serializeTimeToAchieve,
  type TimeToAchieveUnit,
} from "../lib/timeToAchieve";

const fieldClass =
  "rounded-lg border border-border bg-input px-3 py-2.5 text-base text-foreground shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export type TimeToAchieveUnitLabels = {
  day: string;
  month: string;
  year: string;
  /** Accessible name for the unit dropdown */
  unitSelectAria: string;
};

type Props = {
  id?: string;
  value: string;
  onChange: (serialized: string) => void;
  unitLabels: TimeToAchieveUnitLabels;
  /** When true, an empty amount clears the value (optional registration field). */
  allowEmpty?: boolean;
  className?: string;
};

/**
 * @param value - Current stored horizon phrase (may be empty when `allowEmpty`)
 * @param onChange - English phrases such as `"6 months"`, or `""` when unset
 * @param unitLabels - Localized option labels + aria for the unit control
 */
export function TimeToAchieveField({
  id,
  value,
  onChange,
  unitLabels,
  allowEmpty = false,
  className,
}: Props) {
  const [amountStr, setAmountStr] = useState("");
  const [unit, setUnit] = useState<TimeToAchieveUnit>("month");

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setAmountStr("");
      setUnit("month");
      return;
    }
    const next = parseTimeToAchieveString(trimmed);
    setAmountStr(String(next.amount));
    setUnit(next.unit);
  }, [value]);

  function emit(amount: number, nextUnit: TimeToAchieveUnit): void {
    onChange(serializeTimeToAchieve(amount, nextUnit));
  }

  function normalizeAmountDigits(raw: string): string {
    return raw.replace(/\D/g, "").slice(0, 3);
  }

  return (
    <div className={cn("flex flex-wrap gap-2 sm:flex-nowrap", className)}>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        maxLength={3}
        value={amountStr}
        onChange={(e) => {
          const digits = normalizeAmountDigits(e.target.value);
          setAmountStr(digits);
          if (digits === "") {
            if (allowEmpty) onChange("");
            return;
          }
          const n = parseInt(digits, 10);
          if (!Number.isNaN(n) && n >= 1) emit(Math.min(999, n), unit);
        }}
        onBlur={() => {
          if (amountStr === "") {
            if (allowEmpty) {
              onChange("");
              return;
            }
            setAmountStr("1");
            emit(1, unit);
            return;
          }
          let n = parseInt(amountStr, 10);
          if (Number.isNaN(n) || n < 1) n = 1;
          n = Math.min(999, n);
          setAmountStr(String(n));
          emit(n, unit);
        }}
        className={cn(fieldClass, "min-w-[5rem] flex-1 font-tabular-nums")}
      />
      <select
        value={unit}
        aria-label={unitLabels.unitSelectAria}
        onChange={(e) => {
          const nextUnit = e.target.value as TimeToAchieveUnit;
          setUnit(nextUnit);
          if (allowEmpty && amountStr === "") {
            onChange("");
            return;
          }
          let n = parseInt(amountStr, 10);
          if (Number.isNaN(n) || n < 1) {
            if (allowEmpty) {
              onChange("");
              return;
            }
            n = 1;
            setAmountStr("1");
          }
          emit(Math.min(999, n), nextUnit);
        }}
        className={cn(fieldClass, "min-w-[7.5rem] shrink-0 cursor-pointer")}
      >
        <option value="day">{unitLabels.day}</option>
        <option value="month">{unitLabels.month}</option>
        <option value="year">{unitLabels.year}</option>
      </select>
    </div>
  );
}
