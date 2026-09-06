import { describe, expect, it } from "vitest";
import { selectHomepagePosts } from "../../src/lib/homepage-posts";

describe("selectHomepagePosts", () => {
  it("selects the empty state only when the supplied published-post list is empty", () => {
    expect(selectHomepagePosts([])).toEqual({ kind: "empty", posts: [] });
    expect(selectHomepagePosts([{ slug: "published-post" }])).toEqual({
      kind: "posts",
      posts: [{ slug: "published-post" }],
    });
  });

  it("keeps the first two supplied published posts without an empty state", () => {
    expect(selectHomepagePosts([
      { slug: "newest-post" },
      { slug: "next-post" },
      { slug: "older-post" }
    ])).toEqual({
      kind: "posts",
      posts: [{ slug: "newest-post" }, { slug: "next-post" }],
    });
  });
});
