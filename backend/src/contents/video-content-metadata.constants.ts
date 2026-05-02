/** CEFR labels the model is allowed to assign as system tags. */
export const VIDEO_SYSTEM_TAG_LEVELS = [
  'Pre-A1',
  'A1',
  'A2',
  'B1',
  'B2',
  'C1',
  'C2',
] as const;

export type VideoSystemTagLevel = (typeof VIDEO_SYSTEM_TAG_LEVELS)[number];

const ALLOWED = new Set<string>(VIDEO_SYSTEM_TAG_LEVELS);

export function normalizeSystemTags(raw: string[]): string[] {
  const out: string[] = [];
  for (const s of raw) {
    if (typeof s !== 'string') continue;
    const t = s.trim();
    if (ALLOWED.has(t) && !out.includes(t)) {
      out.push(t);
    }
  }
  return out;
}

export function normalizeUserTags(raw: string[]): string[] {
  const out: string[] = [];
  for (const s of raw) {
    if (typeof s !== 'string') continue;
    const t = s.trim().slice(0, 64);
    if (t.length > 0 && !out.includes(t) && out.length < 20) {
      out.push(t);
    }
  }
  return out;
}

export function normalizeComplexity(n: unknown): number | null {
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    return null;
  }
  return Math.min(10, Math.max(1, Math.round(n)));
}
