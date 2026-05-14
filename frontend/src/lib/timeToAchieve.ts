/**
 * Parses and serializes `timeToAchieve` profile strings so horizons stay compatible
 * with `approximateHorizonDaysForUi` in `learningPlan.ts` (expects English day/month/year tokens).
 */

import { DEFAULT_TIME_HORIZON } from "./learningPlan";

export type TimeToAchieveUnit = "day" | "month" | "year";

/**
 * Extracts a positive integer amount and coarse unit from free-form or legacy text.
 *
 * @param raw - Stored profile value
 */
export function parseTimeToAchieveString(
  raw: string | undefined | null,
): { amount: number; unit: TimeToAchieveUnit } {
  const original = (raw ?? "").trim();
  const s = original.toLowerCase().replace(/\s+/g, " ");
  if (!s) {
    return { amount: 1, unit: "month" };
  }
  const halfYear =
    /\bhalf\s*a\s*year\b/.test(s) ||
    /\b6\s*months\b/.test(s) ||
    /\bsix\s*months\b/.test(s);
  if (halfYear) {
    return { amount: 6, unit: "month" };
  }
  const numMatch = s.match(/(\d+(?:\.\d+)?)/);
  const amount = numMatch ?
    Math.min(999, Math.max(1, Math.round(parseFloat(numMatch[1]))))
  : 1;
  if (/\b(days?|день|дня|дні|днів|дней)\b/.test(s)) {
    return { amount, unit: "day" };
  }
  if (
    /\b(years?|yrs?|рік|року|років|роки|лет|год|года|лет)\b/.test(s) ||
    /\d(?:\.\d+)?\s*y\b/.test(s)
  ) {
    return { amount, unit: "year" };
  }
  if (
    /\b(months?|mos?|місяць|місяці|місяців|месяц|месяца|месяцев)\b/.test(s) ||
    /\d(?:\.\d+)?\s*m\b/.test(s)
  ) {
    return { amount, unit: "month" };
  }
  return { amount, unit: "month" };
}

/**
 * Canonical English phrase for API / planning heuristics (e.g. `"6 months"`).
 *
 * @param amount - Whole days / months / years, clamped 1…999
 * @param unit - Calendar bucket
 */
export function serializeTimeToAchieve(
  amount: number,
  unit: TimeToAchieveUnit,
): string {
  const n = Math.min(999, Math.max(1, Math.round(Number(amount)) || 1));
  if (unit === "day") return n === 1 ? "1 day" : `${n} days`;
  if (unit === "month") return n === 1 ? "1 month" : `${n} months`;
  return n === 1 ? "1 year" : `${n} years`;
}

/**
 * Canonical English storage form; empty profile falls back to {@link DEFAULT_TIME_HORIZON}.
 */
export function canonicalTimeToAchieveFromProfile(
  raw: string | undefined | null,
): string {
  const trimmed = (raw ?? "").trim();
  const source = trimmed.length > 0 ? trimmed : DEFAULT_TIME_HORIZON;
  const parsed = parseTimeToAchieveString(source);
  return serializeTimeToAchieve(parsed.amount, parsed.unit);
}
