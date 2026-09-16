import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { glob } from "astro/loaders";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Collections = Record<string, unknown[]>;

const mockedCollections = vi.hoisted((): { current: Collections } => ({ current: {} }));

vi.mock("astro:content", () => ({
  defineCollection: <T>(collection: T) => collection,
  getCollection: async (collection: string) => mockedCollections.current[collection] ?? []
}));

import { sourceFileEntryId } from "../../src/content.config";
import {
  assertUniqueContentIdentifiers,
  countPublished,
  getHomepageCounts,
  getProfile,
  getPublishedPosts,
  getPublishedProjects,
  getPublishedPublications,
  sortPostsNewestFirst,
  sortPublicationsNewestFirst
} from "../../src/lib/content";

function publication(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    collection: "publications",
    data: {
      citationKey: id,
      title: id,
      authors: ["Example Author"],
      year: 2024,
      venue: "Example Venue",
      type: "journal",
      status: "published",
      links: [],
      draft: false,
      ...overrides
    }
  };
}

function project(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    collection: "projects",
    data: {
      slug: id,
      titleZh: "示例项目",
      titleEn: "Example project",
      summaryZh: "示例摘要",
      summaryEn: "Example summary",
      bodyZh: "示例正文",
      bodyEn: "Example body",
      start: "2024-01-01",
      status: "active",
      roleZh: "示例角色",
      roleEn: "Example role",
      coverAltZh: "",
      coverAltEn: "",
      links: [],
      publicationKeys: [],
      draft: false,
      ...overrides
    }
  };
}

function post(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    collection: "blog",
    body: "Example body",
    data: {
      language: "zh",
      title: "示例文章",
      summary: "示例摘要",
      slug: id,
      publishedAt: new Date("2024-01-01"),
      category: "Example",
      tags: [],
      coverAlt: "",
      draft: false,
      ...overrides
    }
  };
}

function profile(id = "profile.yaml") {
  return {
    id,
    collection: "profile",
    data: {
      nameZh: "待填写",
      nameEn: "To be provided",
      roleZh: "待填写",
      roleEn: "To be provided",
      statementZh: "待填写",
      statementEn: "To be provided",
      bioZh: "待填写",
      bioEn: "To be provided",
      interestsZh: [],
      interestsEn: [],
      portrait: "/images/placeholder-portrait.svg",
      portraitAltZh: "待填写",
      portraitAltEn: "To be provided",
      education: [],
      experience: [],
      honors: [],
      service: [],
      skillsZh: [],
      skillsEn: [],
      email: "replace-me@example.com",
      links: [],
      authorAliases: []
    }
  };
}

beforeEach(() => {
  mockedCollections.current = { profile: [profile()], publications: [], projects: [], blog: [] };
});

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

  it("returns only published publications in stable newest-first order", async () => {
    mockedCollections.current.publications = [
      publication("older", { title: "Older", year: 2024 }),
      publication("same-year-b", { title: "Beta", year: 2026 }),
      publication("draft", { title: "Draft", year: 2030, draft: true }),
      publication("same-year-a", { title: "Alpha", year: 2026 })
    ];

    await expect(getPublishedPublications()).resolves.toMatchObject([
      { id: "same-year-a" },
      { id: "same-year-b" },
      { id: "older" }
    ]);
  });

  it("returns only published projects ordered by start date then public slug", async () => {
    mockedCollections.current.projects = [
      project("older", { start: "2024-01-01", slug: "older" }),
      project("same-date-b", { start: "2026-01-01", slug: "beta" }),
      project("draft", { start: "2030-01-01", draft: true }),
      project("same-date-a", { start: "2026-01-01", slug: "alpha" })
    ];

    await expect(getPublishedProjects()).resolves.toMatchObject([
      { id: "same-date-a" },
      { id: "same-date-b" },
      { id: "older" }
    ]);
  });

  it("filters published posts by locale and leaves the other locale available", async () => {
    mockedCollections.current.blog = [
      post("zh-older", { language: "zh", slug: "older", publishedAt: new Date("2024-01-01") }),
      post("en-newer", { language: "en", slug: "newer", publishedAt: new Date("2026-01-01") }),
      post("zh-newer", { language: "zh", slug: "newer", publishedAt: new Date("2025-01-01") }),
      post("zh-draft", { language: "zh", slug: "draft", draft: true })
    ];

    await expect(getPublishedPosts("zh")).resolves.toMatchObject([
      { id: "zh-newer" },
      { id: "zh-older" }
    ]);
    await expect(getPublishedPosts("en")).resolves.toMatchObject([{ id: "en-newer" }]);
  });

  it("counts published records across both blog locales", async () => {
    mockedCollections.current.publications = [publication("published"), publication("draft", { draft: true })];
    mockedCollections.current.projects = [project("published"), project("draft", { draft: true })];
    mockedCollections.current.blog = [
      post("zh", { language: "zh" }),
      post("en", { language: "en" }),
      post("draft", { language: "zh", draft: true })
    ];

    await expect(getHomepageCounts()).resolves.toEqual({ publications: 1, projects: 1, posts: 2 });
  });

  it("requires exactly one profile record", async () => {
    mockedCollections.current.profile = [];
    await expect(getProfile()).rejects.toThrow("Expected exactly one profile record, found 0");

    mockedCollections.current.profile = [profile("first.yaml"), profile("second.yaml")];
    await expect(getProfile()).rejects.toThrow("Expected exactly one profile record, found 2");
  });
});

describe("content identifier validation", () => {
  it.each([
    {
      name: "normalized DOI",
      input: {
        publications: [
          { id: "publications/first.yaml", citationKey: "first", doi: "10.1000/ABC" },
          { id: "publications/second.yaml", citationKey: "second", doi: "https://doi.org/10.1000/abc" }
        ],
        projects: [],
        posts: []
      },
      label: "DOI"
    },
    {
      name: "citation key",
      input: {
        publications: [
          { id: "publications/first.yaml", citationKey: "Example2026" },
          { id: "publications/second.yaml", citationKey: "example2026" }
        ],
        projects: [],
        posts: []
      },
      label: "citation key"
    },
    {
      name: "citation-key file stem",
      input: {
        publications: [
          { id: "publications/first.yaml", citationKey: "Example 2026" },
          { id: "publications/second.yaml", citationKey: "example-2026" }
        ],
        projects: [],
        posts: []
      },
      label: "citation-key file stem"
    },
    {
      name: "project slug",
      input: {
        publications: [],
        projects: [
          { id: "projects/first.md", slug: "same-project" },
          { id: "projects/second.md", slug: "SAME-PROJECT" }
        ],
        posts: []
      },
      label: "project slug"
    },
    {
      name: "blog slug within one language",
      input: {
        publications: [],
        projects: [],
        posts: [
          { id: "blog/first.md", language: "zh" as const, slug: "same-post" },
          { id: "blog/second.md", language: "zh" as const, slug: "SAME-POST" }
        ]
      },
      label: "blog language-and-slug"
    }
  ])("reports both source IDs for duplicate $name", ({ input, label }) => {
    expect(() => assertUniqueContentIdentifiers(input)).toThrow(
      new RegExp(`Duplicate ${label}.*first.*second`, "i")
    );
  });

  it("allows one public post slug in each locale", () => {
    expect(() => assertUniqueContentIdentifiers({
      publications: [],
      projects: [],
      posts: [
        { id: "blog/zh.md", language: "zh", slug: "shared-slug" },
        { id: "blog/en.md", language: "en", slug: "shared-slug" }
      ]
    })).not.toThrow();
  });

  it("rejects duplicate resource slugs", () => {
    expect(() => assertUniqueContentIdentifiers({
      publications: [],
      projects: [],
      posts: [],
      resources: [
        { id: "resources/first.yaml", slug: "shared-resource" },
        { id: "resources/second.yaml", slug: "SHARED-RESOURCE" }
      ]
    })).toThrow(/Duplicate resource slug(?=.*first\.yaml)(?=.*second\.yaml)/i);
  });
});

describe("Astro glob loader integration", () => {
  it("retains duplicate public slugs from separate source files for explicit validation", async () => {
    const directory = await mkdtemp(join(tmpdir(), "research-blog-content-"));
    const entries = new Map<string, { id: string; data: { slug: string } }>();
    const store = {
      keys: () => entries.keys(),
      get: (id: string) => entries.get(id),
      set: (entry: { id: string; data: { slug: string } }) => entries.set(entry.id, entry),
      delete: (id: string) => entries.delete(id)
    };

    try {
      await writeFile(join(directory, "first.md"), "same-project", "utf8");
      await writeFile(join(directory, "second.md"), "same-project", "utf8");
      const projectLoader = glob({
        pattern: "**/*.md",
        base: pathToFileURL(`${directory}${sep}`),
        generateId: sourceFileEntryId
      });

      // The real glob loader reads only these fields during an initial, non-watched load.
      const loaderContext = {
        config: {
          root: pathToFileURL(`${directory}${sep}`),
          srcDir: pathToFileURL(`${directory}${sep}`)
        },
        collection: "projects",
        logger: { warn: () => undefined, error: () => undefined, info: () => undefined },
        parseData: async ({ data }: { data: { slug: string } }) => data,
        store,
        generateDigest: (contents: string) => contents,
        entryTypes: new Map([[".md", { getEntryInfo: async ({ contents }: { contents: string }) => ({ body: "", data: { slug: contents } }) }]])
      } as unknown as Parameters<typeof projectLoader.load>[0];

      await projectLoader.load(loaderContext);

      expect([...entries.keys()].sort()).toEqual(["first.md", "second.md"]);
      expect(() => assertUniqueContentIdentifiers({
        publications: [],
        projects: [...entries.values()].map(({ id, data }) => ({ id, slug: data.slug })),
        posts: []
      })).toThrow(/Duplicate project slug(?=.*first\.md)(?=.*second\.md)/i);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("uses the source path unchanged as the collection entry ID", () => {
    expect(sourceFileEntryId({ entry: "nested/source-file.md" })).toBe("nested/source-file.md");
  });
});
