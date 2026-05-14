/**
 * Replaces `{name}`-style placeholders in UI copy (simple i18n interpolation).
 *
 * @param template - String containing `{key}` tokens
 * @param values - Replacement values for each key
 * @returns Template with substitutions applied
 */
export function formatMessage(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    return value !== undefined && value !== null ? String(value) : "";
  });
}
