import { describe, expect, it } from "vitest";
import {
  assertUniqueContentIdentifiers,
  countPublished,
  sortPostsNewestFirst,
  sortPublicationsNewestFirst
} from "../../src/lib/content";

describe("content selectors", () => {
  it("excludes drafts from counts", () => {
    expect(countPublished([{ draft: false }, { draft: true }, { draft: false }])).toBe(2);
  });

  it("sorts posts newest first", () => {
    const sorted = sortPostsNewestFirst([
      { publishedAt: new Date("2025-01-01"), slug: "older" },
      { publishedAt: new Date("2026-01-01"), slug: "newer" }
    ]);
    expect(sorted[0].publishedAt.getFullYear()).toBe(2026);
  });

  it("sorts publications by year then title", () => {
    const sorted = sortPublicationsNewestFirst([
      { year: 2024, title: "B" },
      { year: 2026, title: "C" },
      { year: 2026, title: "A" }
    ]);
    expect(sorted.map((item) => item.title)).toEqual(["A", "C", "B"]);
  });

  it("rejects duplicate normalized publication DOI values", () => {
    expect(() => assertUniqueContentIdentifiers({
      publications: [
        { id: "first", citationKey: "first", doi: "10.1000/ABC" },
        { id: "second", citationKey: "second", doi: "https://doi.org/10.1000/abc" }
      ],
      projects: [],
      posts: []
    })).toThrow(/duplicate DOI.*first.*second/i);
  });
});
