const ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export type CefrLevel = (typeof ORDER)[number];

export function parseCefrLevel(text: string): CefrLevel {
  const m = text.trim().match(/\b(A1|A2|B1|B2|C1|C2)\b/i);
  if (!m?.[1]) return "A1";
  return m[1].toUpperCase() as CefrLevel;
}

export function cefrIndex(level: CefrLevel): number {
  const i = ORDER.indexOf(level);
  return i < 0 ? 0 : i;
}

export function cefrOrder(): readonly CefrLevel[] {
  return ORDER;
}
