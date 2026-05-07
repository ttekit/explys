import { cn } from "../../lib/utils";

/** 0–1 mastery → percentage label and bar width (profile progress). */
export function pct01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(Math.min(1, Math.max(0, value)) * 100);
}

export function SkillBar({
  label,
  value,
  barClass,
}: {
  label: string;
  value: number;
  barClass: string;
}) {
  const p = pct01(value);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-foreground">{p}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-[width]", barClass)}
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}

const SHIFT_VISUAL_CAP = 14;

/** Point change on ~0–100 mastery scale; same row layout as SkillBar (profile progress). */
export function KnowledgeShiftBar({
  label,
  deltaPoints,
  barClass,
  suffix = "pts",
}: {
  label: string;
  deltaPoints: number;
  barClass: string;
  /** e.g. "pts" or empty for "+3" only */
  suffix?: string;
}) {
  const sign = deltaPoints > 0 ? "+" : "";
  const right =
    suffix ?
      `${sign}${deltaPoints} ${suffix}`
    : `${sign}${deltaPoints}`;
  const w =
    deltaPoints === 0 ?
      5
    : Math.min(100, (Math.abs(deltaPoints) / SHIFT_VISUAL_CAP) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-foreground">{right}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-[width]", barClass)}
          style={{ width: `${w}%` }}
        />
      </div>
    </div>
  );
}
