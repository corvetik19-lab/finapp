export const CATEGORY_WIDGET_KEY = "category-management";

export type CategoryWidgetPreferencesState = {
  visibleIds: string[];
};

export function normalizeWidgetVisibleIds(
  ids: unknown,
  allowed?: Set<string>
): string[] {
  if (!Array.isArray(ids)) {
    return [];
  }

  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of ids) {
    if (typeof value !== "string") continue;
    if (seen.has(value)) continue;
    if (allowed && !allowed.has(value)) continue;
    seen.add(value);
    result.push(value);
  }

  return result;
}
