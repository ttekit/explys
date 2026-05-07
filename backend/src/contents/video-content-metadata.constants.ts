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

/**
 * Keeps only values that match a `Genre.name` in the database (case-insensitive);
 * returned strings use the canonical DB spelling.
 */
export function normalizeUserTagsToAllowedGenres(
  raw: string[],
  allowedGenreNames: readonly string[],
): string[] {
  if (!allowedGenreNames.length) {
    return [];
  }
  const canonByLower = new Map<string, string>();
  for (const n of allowedGenreNames) {
    if (typeof n !== 'string') continue;
    const t = n.trim();
    if (!t) continue;
    canonByLower.set(t.toLowerCase(), t);
  }
  const out: string[] = [];
  for (const s of raw) {
    if (typeof s !== 'string') continue;
    const key = s.trim().slice(0, 64).toLowerCase();
    if (!key) continue;
    const canon = canonByLower.get(key);
    if (canon && !out.includes(canon) && out.length < 20) {
      out.push(canon);
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
