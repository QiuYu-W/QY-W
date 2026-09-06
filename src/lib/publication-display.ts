/** Compare human-visible names conservatively: case-folding and surrounding whitespace only. */
export function isOwnerAuthor(author: string, aliases: string[]): boolean {
  const normalized = author.trim().toLocaleLowerCase();
  return aliases.some((alias) => normalized === alias.trim().toLocaleLowerCase());
}

/** Group already-sorted publications by year without reordering siblings. */
export function groupPublicationsByYear<T extends { year: number }>(publications: T[]): Array<{ year: number; publications: T[] }> {
  const grouped = new Map<number, T[]>();
  for (const publication of publications) {
    const entries = grouped.get(publication.year) ?? [];
    entries.push(publication);
    grouped.set(publication.year, entries);
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => right - left)
    .map(([year, entries]) => ({ year, publications: entries }));
}
