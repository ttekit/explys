/** Normalizes login/register email: BOM, trim, lowercase (must match `AuthService.normalizeEmail`). */
export function trimEmailInput(value: unknown): string {
  return String(value ?? '')
    .replace(/^\uFEFF+/g, '')
    .trim()
    .toLowerCase();
}
