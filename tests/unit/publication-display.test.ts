import { describe, expect, it } from "vitest";
import { groupPublicationsByYear, isOwnerAuthor } from "../../src/lib/publication-display";

describe("publication display rules", () => {
  it("emphasizes only exact trimmed, case-folded owner aliases", () => {
    const aliases = ["王小明", "Xiaoming Wang", "X. Wang"];

    expect(isOwnerAuthor(" xIaOmInG wAnG ", aliases)).toBe(true);
    expect(isOwnerAuthor("X. WANG", aliases)).toBe(true);
    expect(isOwnerAuthor("Xiaoming Wang Jr.", aliases)).toBe(false);
    expect(isOwnerAuthor("Another Xiaoming Wang", aliases)).toBe(false);
  });

  it("groups newest years first while preserving publication order within a year", () => {
    expect(groupPublicationsByYear([
      { year: 2025, title: "First" },
      { year: 2026, title: "Newer" },
      { year: 2025, title: "Second" }
    ])).toEqual([
      { year: 2026, publications: [{ year: 2026, title: "Newer" }] },
      { year: 2025, publications: [{ year: 2025, title: "First" }, { year: 2025, title: "Second" }] }
    ]);
  });
});
