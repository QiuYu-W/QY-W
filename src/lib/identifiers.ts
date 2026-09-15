/** Normalize DOI values for consistent validation and duplicate detection. */
export function normalizeDoi(value?: string): string | undefined {
  if (value === undefined) return undefined;

  const normalized = value
    .trim()
    .replace(/^doi:\s*/i, "")
    .replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "")
    .trim()
    .toLowerCase();

  return normalized || undefined;
}

/** Convert a citation key into the portable filename stem used by imports. */
export function fileStemForCitationKey(value: string): string {
  const stem = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!stem) {
    throw new Error("Citation key must contain at least one alphanumeric character");
  }

  return stem;
}
