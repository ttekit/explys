export function normalizeVocabularyTerm(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 200);
}
