/**
 * Monday 00:00 UTC through the following Monday exclusive — aligns with profile weekly charts.
 */
export function getUtcMondayWeekRange(now = new Date()): {
  weekStart: Date;
  weekEndExclusive: Date;
} {
  const day = (d: Date) => d.getUTCDay();
  const x = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const dow = day(x);
  const offset = dow === 0 ? -6 : 1 - dow;
  x.setUTCDate(x.getUTCDate() + offset);
  x.setUTCHours(0, 0, 0, 0);
  const weekEndExclusive = new Date(x);
  weekEndExclusive.setUTCDate(weekEndExclusive.getUTCDate() + 7);
  return { weekStart: x, weekEndExclusive };
}

/** `YYYY-MM-DD` for the Monday of the given instant’s UTC week. */
export function formatUtcWeekStartDate(weekStart: Date): string {
  return weekStart.toISOString().slice(0, 10);
}
