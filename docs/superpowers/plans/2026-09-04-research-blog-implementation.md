# Comprehensive Research Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual academic profile and research blog with a visual Pages CMS editing workflow, BibTeX-assisted publication management, and safe automatic deployment to GitHub Pages.

**Architecture:** Astro generates a static Chinese-default site plus English structural routes from file-backed content collections. Pages CMS edits those Markdown, YAML, and media files in a public GitHub repository; GitHub Actions validates, tests, builds, and deploys only successful revisions. Bibliographic imports run as a separate atomic workflow and feed the same publication collection used by the site and CMS.

**Tech Stack:** Astro, TypeScript, Astro Content Layer, Pages CMS, pnpm, Vitest, Playwright, axe-core, MiniSearch, Citation.js, GitHub Actions, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-04-research-blog-design.md`

## Global Constraints

- Run this plan in the root of the future public website Git repository, not in the read-only ChatGPT project mirror.
- Use only free services in the first release: GitHub, GitHub Actions, GitHub Pages, and the hosted Pages CMS application.
- Keep all visitor-facing content in repository files; do not add a database, server runtime, comments, visitor accounts, or contact form.
- Chinese is the default language at `/`; English structural pages live under `/en/`.
- Structural pages and projects are bilingual; each blog post is either Chinese or English.
- Do not create a research-directions page, a separate CV page, a separate contact page, a CV download, or a homepage featured-results section.
- Keep the approved academic-minimal homepage: portrait, concise introduction, clickable publication/project/blog counts, and the two newest published posts.
- Never invent biographical or publication facts. Production content must be supplied or approved by the site owner.
- Treat every file in the public repository, including `draft: true` content, as publicly readable; never store confidential research or secrets there.
- Pin resolved package versions in `pnpm-lock.yaml`; prefer current stable releases compatible with Node.js 24 LTS at execution time.
- Use test-first development for content logic, route helpers, BibTeX merging, search, and publication/project/blog selectors.
- End every task with a focused commit after its tests pass.

## Planned File Structure

```text
.
├── .github/workflows/
│   ├── ci.yml                       # Pull-request and push validation
│   ├── deploy.yml                   # Main-branch GitHub Pages deployment
│   └── import-publications.yml      # Manual/Pages CMS BibTeX import
├── .gitignore
├── .pages.yml                       # Pages CMS media, schemas, and actions
├── docs/
│   ├── images/
│   │   ├── actions-build-status.png
│   │   ├── cms-edit-profile.png
│   │   └── cms-import-bibtex.png
│   ├── CONTENT-GUIDE.md
│   └── OPERATIONS.md
├── imports/publications.bib         # Uploaded BibTeX source
├── public/
│   ├── media/                       # CMS-managed images
│   ├── favicon.svg
│   └── robots.txt
├── scripts/
│   ├── import-bibtex.ts             # Atomic import entry point
│   └── verify-dist.ts               # Generated-site internal-link checks
├── src/
│   ├── components/
│   │   ├── BlogExplorer.astro
│   │   ├── CountLinks.astro
│   │   ├── Footer.astro
│   │   ├── Header.astro
│   │   ├── LanguageSwitch.astro
│   │   ├── ProjectCard.astro
│   │   └── PublicationList.astro
│   ├── data/
│   │   ├── blog/                    # One Markdown file per post
│   │   ├── profile/profile.yaml     # Single bilingual profile record
│   │   ├── projects/                # One Markdown file per bilingual project
│   │   └── publications/            # One YAML file per publication
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   └── PostLayout.astro
│   ├── lib/
│   │   ├── bibtex.ts
│   │   ├── content.ts
│   │   ├── identifiers.ts
│   │   ├── i18n.ts
│   │   ├── markdown.ts
│   │   ├── schemas.ts
│   │   ├── search.ts
│   │   └── urls.ts
│   ├── pages/
│   │   ├── 404.astro
│   │   ├── about.astro
│   │   ├── blog/[...id].astro
│   │   ├── blog/index.astro
│   │   ├── en/about.astro
│   │   ├── en/blog/[...id].astro
│   │   ├── en/blog/index.astro
│   │   ├── en/index.astro
│   │   ├── en/projects/[id].astro
│   │   ├── en/projects/index.astro
│   │   ├── en/publications.astro
│   │   ├── en/rss.xml.ts
│   │   ├── index.astro
│   │   ├── projects/[id].astro
│   │   ├── projects/index.astro
│   │   ├── publications.astro
│   │   ├── rss.xml.ts
│   │   └── search-index.json.ts
│   ├── styles/global.css
│   ├── views/
│   │   ├── AboutPage.astro
│   │   ├── BlogIndexPage.astro
│   │   ├── BlogPostPage.astro
│   │   ├── HomePage.astro
│   │   ├── ProjectPage.astro
│   │   ├── ProjectsPage.astro
│   │   └── PublicationsPage.astro
│   └── content.config.ts
├── tests/
│   ├── e2e/site.spec.ts
│   ├── fixtures/bibtex/
│   │   ├── invalid.bib
│   │   ├── sample.bib
│   │   └── updated.bib
│   └── unit/
│       ├── bibtex.test.ts
│       ├── content.test.ts
│       ├── i18n.test.ts
│       ├── search.test.ts
│       └── verify-dist.test.ts
├── astro.config.mjs
├── package.json
├── playwright.config.ts
├── pnpm-lock.yaml
├── README.md
├── tsconfig.json
└── vitest.config.ts
```

## Execution Prerequisites

- At the start of implementation, obtain the owner's GitHub account and final repository name; do not infer either from the local computer username.
- Work in a dedicated website repository with a clean status. If the repository does not yet exist, create it as public only after confirming the final name, set `main` as the default branch, and keep the ChatGPT project mirror outside that repository.
- Confirm GitHub authentication before the first remote write. Restrict the Pages CMS GitHub App installation to this one repository.
- After Task 9 is merged, set GitHub Pages source to “GitHub Actions” and add the `SITE_URL` repository variable before running the first production deployment.

---

### Task 1: Astro Foundation and Test Harness

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `src/lib/i18n.ts`
- Create: `tests/unit/i18n.test.ts`
- Create: `src/styles/global.css`
- Create: `public/favicon.svg`
- Create: `public/robots.txt`

**Interfaces:**
- Produces: `type Locale = "zh" | "en"`
- Produces: `localizedPath(locale: Locale, path: string): string`
- Produces: `alternateLocale(locale: Locale): Locale`
- Produces: package scripts `dev`, `build`, `check`, `test`, `test:unit`, `test:e2e`, and `verify`

- [ ] **Step 1: Initialize package metadata and install the exact dependency families**

Run:

```bash
pnpm init
pnpm add astro @astrojs/check @astrojs/rss @astrojs/sitemap cheerio minisearch micromark yaml @citation-js/core @citation-js/plugin-bibtex
pnpm add -D typescript tsx vitest @playwright/test @axe-core/playwright
```

Edit `package.json` to contain these scripts and runtime floor:

```json
{
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "check": "astro check",
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:e2e": "playwright test",
    "verify": "pnpm check && pnpm test && pnpm build && tsx scripts/verify-dist.ts"
  }
}
```

Commit the generated `pnpm-lock.yaml`; do not hand-edit it.

Create `.gitignore` with exactly these generated paths:

```gitignore
node_modules/
dist/
.astro/
.tmp/
playwright-report/
test-results/
coverage/
```

- [ ] **Step 2: Write the failing locale-helper test**

Create `tests/unit/i18n.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { alternateLocale, localizedPath } from "../../src/lib/i18n";

describe("localizedPath", () => {
  it("keeps Chinese at the root and prefixes English", () => {
    expect(localizedPath("zh", "/projects/demo/")).toBe("/projects/demo/");
    expect(localizedPath("en", "/projects/demo/")).toBe("/en/projects/demo/");
  });

  it("normalizes missing leading and trailing slashes", () => {
    expect(localizedPath("zh", "about")).toBe("/about/");
    expect(localizedPath("en", "about")).toBe("/en/about/");
  });
});

describe("alternateLocale", () => {
  it("switches between Chinese and English", () => {
    expect(alternateLocale("zh")).toBe("en");
    expect(alternateLocale("en")).toBe("zh");
  });
});
```

- [ ] **Step 3: Run the test and confirm the intended failure**

Run: `pnpm vitest run tests/unit/i18n.test.ts`

Expected: FAIL because `src/lib/i18n.ts` does not exist.

- [ ] **Step 4: Implement locale helpers**

Create `src/lib/i18n.ts`:

```ts
export type Locale = "zh" | "en";

function normalize(path: string): string {
  const core = path.replace(/^\/+|\/+$/g, "");
  return core ? `/${core}/` : "/";
}

export function localizedPath(locale: Locale, path: string): string {
  const normalized = normalize(path);
  if (locale === "zh") return normalized;
  return normalized === "/" ? "/en/" : `/en${normalized}`;
}

export function alternateLocale(locale: Locale): Locale {
  return locale === "zh" ? "en" : "zh";
}
```

- [ ] **Step 5: Configure Astro and test runners**

Create `astro.config.mjs`:

```js
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

const publicUrl = new URL(process.env.SITE_URL || "http://localhost:4321");
const base = publicUrl.pathname.replace(/\/$/, "") || "/";

export default defineConfig({
  site: publicUrl.origin,
  base,
  output: "static",
  trailingSlash: "always",
  i18n: {
    locales: ["zh", "en"],
    defaultLocale: "zh",
    routing: { prefixDefaultLocale: false, redirectToDefaultLocale: false }
  },
  integrations: [sitemap()]
});
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({ test: { environment: "node" } });
```

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  webServer: { command: "pnpm dev", url: "http://127.0.0.1:4321", reuseExistingServer: !process.env.CI },
  use: { baseURL: "http://127.0.0.1:4321" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }
  ]
});
```

Set `tsconfig.json` to extend `astro/tsconfigs/strict`. Add global CSS variables, readable typography, focus styles, content width, responsive breakpoints, and reduced-motion handling in `src/styles/global.css`. Create a simple text-based `public/favicon.svg` and allow normal indexing in `public/robots.txt`.

- [ ] **Step 6: Run foundation checks**

Run:

```bash
pnpm vitest run tests/unit/i18n.test.ts
pnpm check
```

Expected: locale tests PASS and Astro type checking exits 0.

- [ ] **Step 7: Commit**

```bash
git add .gitignore package.json pnpm-lock.yaml astro.config.mjs tsconfig.json vitest.config.ts playwright.config.ts src/lib/i18n.ts tests/unit/i18n.test.ts src/styles/global.css public/favicon.svg public/robots.txt
git commit -m "chore: initialize Astro research site"
```

---

### Task 2: Typed Content Collections and Content Selectors

**Files:**
- Create: `src/content.config.ts`
- Create: `src/lib/content.ts`
- Create: `src/lib/identifiers.ts`
- Create: `src/lib/schemas.ts`
- Create: `src/data/profile/profile.yaml`
- Create: `src/data/publications/example-publication.yaml`
- Create: `src/data/projects/example-project.md`
- Create: `src/data/blog/example-zh.md`
- Create: `src/data/blog/example-en.md`
- Create: `tests/unit/content.test.ts`

**Interfaces:**
- Produces collections: `profile`, `publications`, `projects`, `blog`
- Produces aliases `Publication = CollectionEntry<"publications">`, `Project = CollectionEntry<"projects">`, and `BlogPost = CollectionEntry<"blog">`.
- Produces: `getProfile(): Promise<Profile>`
- Produces: `getPublishedPublications(): Promise<Publication[]>`
- Produces: `getPublishedProjects(): Promise<Project[]>`
- Produces: `getPublishedPosts(locale?: Locale): Promise<BlogPost[]>`
- Produces: `getHomepageCounts(): Promise<{ publications: number; projects: number; posts: number }>`
- Produces: `type ContentIdentityInput = { publications: Array<{ id: string; citationKey: string; doi?: string }>; projects: Array<{ id: string; slug: string }>; posts: Array<{ id: string; language: Locale; slug: string }> }`.
- Produces: `assertUniqueContentIdentifiers(input: ContentIdentityInput): void` for publication DOI/citation key, project slug, and locale-plus-blog-slug uniqueness.
- Produces: `normalizeDoi(value?: string): string | undefined` and `fileStemForCitationKey(value: string): string` in `src/lib/identifiers.ts`.

- [ ] **Step 1: Write failing selector tests using mocked collection entries**

Create `tests/unit/content.test.ts` with assertions for excluding drafts, newest-first post sorting, publication year sorting, and published-only counts:

```ts
import { describe, expect, it } from "vitest";
import { assertUniqueContentIdentifiers, countPublished, sortPostsNewestFirst, sortPublicationsNewestFirst } from "../../src/lib/content";

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
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `pnpm vitest run tests/unit/content.test.ts`

Expected: FAIL because `src/lib/content.ts` does not exist.

- [ ] **Step 3: Define content schemas**

Create `src/lib/schemas.ts` so Astro and the BibTeX importer validate against the same definitions:

```ts
import { z } from "astro/zod";
import { normalizeDoi } from "./identifiers";

const link = z.object({ label: z.string().min(1), url: z.string().url() });
const localizedItem = z.object({ titleZh: z.string().min(1), titleEn: z.string().min(1), detailZh: z.string().min(1), detailEn: z.string().min(1), start: z.string().optional(), end: z.string().optional() });
const optionalDate = z.preprocess((value) => value === "" ? undefined : value, z.coerce.date().optional());
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const optionalIsoDate = z.union([isoDate, z.literal("")]).optional();
const doi = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().refine((value) => /^10\.\d{4,9}\/\S+$/i.test(normalizeDoi(value) ?? ""), "Invalid DOI").optional()
);

export const profileSchema = z.object({
    nameZh: z.string().min(1), nameEn: z.string().min(1),
    roleZh: z.string().min(1), roleEn: z.string().min(1),
    statementZh: z.string().min(1), statementEn: z.string().min(1),
    bioZh: z.string().min(1), bioEn: z.string().min(1),
    interestsZh: z.array(z.string().min(1)), interestsEn: z.array(z.string().min(1)),
    portrait: z.string().min(1), portraitAltZh: z.string().min(1), portraitAltEn: z.string().min(1),
    education: z.array(localizedItem), experience: z.array(localizedItem),
    honors: z.array(localizedItem), service: z.array(localizedItem),
    skillsZh: z.array(z.string().min(1)), skillsEn: z.array(z.string().min(1)),
    email: z.string().email(), links: z.array(link), authorAliases: z.array(z.string().min(1)).default([])
});

export const publicationSchema = z.object({
    citationKey: z.string().min(1), doi, title: z.string().min(1), titleZh: z.string().optional(),
    authors: z.array(z.string().min(1)).min(1), year: z.number().int().min(1000).max(9999), venue: z.string().min(1),
    type: z.enum(["journal", "conference", "preprint", "book", "chapter", "thesis", "other"]),
    status: z.enum(["published", "accepted", "in-press", "preprint"]),
    volume: z.string().optional(), issue: z.string().optional(), pages: z.string().optional(),
    abstractZh: z.string().optional(), abstractEn: z.string().optional(), links: z.array(link).default([]),
    draft: z.boolean().default(false)
});

export const projectSchema = z.object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    titleZh: z.string().min(1), titleEn: z.string().min(1), summaryZh: z.string().min(1), summaryEn: z.string().min(1),
    bodyZh: z.string().min(1), bodyEn: z.string().min(1), start: isoDate, end: optionalIsoDate,
    status: z.enum(["active", "completed", "paused"]), roleZh: z.string().min(1), roleEn: z.string().min(1),
    cover: z.string().optional(), coverAltZh: z.string().default(""), coverAltEn: z.string().default(""),
    links: z.array(link).default([]), publicationKeys: z.array(z.string()).default([]),
    draft: z.boolean().default(false)
});

export const blogSchema = z.object({
    language: z.enum(["zh", "en"]), title: z.string().min(1), summary: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), publishedAt: z.coerce.date(), updatedAt: optionalDate,
    category: z.string().min(1), tags: z.array(z.string().min(1)).default([]),
    cover: z.string().optional(), coverAlt: z.string().default(""), draft: z.boolean().default(true)
});

export type Profile = z.infer<typeof profileSchema>;
export type PublicationRecord = z.infer<typeof publicationSchema>;
export type ProjectRecord = z.infer<typeof projectSchema>;
export type BlogPostRecord = z.infer<typeof blogSchema>;
```

Then create `src/content.config.ts` with the exact loaders:

```ts
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { blogSchema, profileSchema, projectSchema, publicationSchema } from "./lib/schemas";

const profile = defineCollection({
  loader: glob({ pattern: "profile.{yaml,yml}", base: "./src/data/profile" }),
  schema: profileSchema
});
const publications = defineCollection({
  loader: glob({ pattern: "**/*.{yaml,yml}", base: "./src/data/publications" }),
  schema: publicationSchema
});
const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/data/projects" }),
  schema: projectSchema
});
const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/data/blog", retainBody: true }),
  schema: blogSchema
});

export const collections = { profile, publications, projects, blog };
```

- [ ] **Step 4: Implement pure sort/count helpers and collection-backed selectors**

Create `src/lib/identifiers.ts` with DOI normalization that trims whitespace, removes `doi:` and `https://doi.org/` prefixes case-insensitively, and lowercases the remainder. `fileStemForCitationKey()` lowercases a citation key, replaces each run of non-alphanumeric characters with one hyphen, trims hyphens, and rejects an empty result. Create `src/lib/content.ts`; export the interfaces listed above, pure helpers used by the tests, and async selectors backed by `getCollection()`. Every async selector must exclude entries where `draft === true`; `getHomepageCounts()` must count all published blog posts across both languages. Before returning collection data, call `assertUniqueContentIdentifiers()` and include both source entry IDs in any collision error. Compare normalized DOI, citation keys, generated citation-key file stems, and project slugs globally, and compare blog slugs within each language. `getProfile()` must require exactly one entry and fail with a clear message if zero or multiple profile files exist:

```ts
import { getCollection, type CollectionEntry } from "astro:content";
import type { Profile } from "./schemas";

export type Publication = CollectionEntry<"publications">;
export type Project = CollectionEntry<"projects">;
export type BlogPost = CollectionEntry<"blog">;

export async function getProfile(): Promise<Profile> {
  const entries = await getCollection("profile");
  if (entries.length !== 1) {
    throw new Error(`Expected exactly one profile record, found ${entries.length}`);
  }
  return entries[0].data;
}

export function countPublished(items: Array<{ draft?: boolean }>): number {
  return items.filter((item) => item.draft !== true).length;
}
```

Use stable tie-breaking: publications by descending year then ascending title; posts by descending `publishedAt` then ascending slug; projects by descending start date then ascending slug.

- [ ] **Step 5: Add schema-valid seed content without inventing personal facts**

At execution time, ask the site owner for the required profile fields before creating `src/data/profile/profile.yaml`. Store the profile fields directly at the YAML document root. Add one owner-approved record per production collection so route work can be visually reviewed. Put synthetic parser examples only under `tests/fixtures`; do not publish them.

- [ ] **Step 6: Run schema and selector tests**

Run:

```bash
pnpm vitest run tests/unit/content.test.ts
pnpm check
pnpm build
```

Expected: tests PASS, all content validates, and `dist/` builds.

- [ ] **Step 7: Commit**

```bash
git add src/content.config.ts src/lib/content.ts src/lib/identifiers.ts src/lib/schemas.ts src/data tests/unit/content.test.ts
git commit -m "feat: add typed research content collections"
```

---

### Task 3: Shared Layout, Navigation, Language Switching, and Metadata

**Files:**
- Create: `src/lib/urls.ts`
- Create: `src/components/Header.astro`
- Create: `src/components/Footer.astro`
- Create: `src/components/LanguageSwitch.astro`
- Create: `src/layouts/BaseLayout.astro`
- Modify: `tests/unit/i18n.test.ts`

**Interfaces:**
- Produces: `routeFor(locale: Locale, kind: "home" | "about" | "publications" | "projects" | "blog", slug?: string): string`
- Produces: `assetUrl(path: string): string` for CMS-stored root-relative media paths.
- Produces: `BaseLayout` props `{ locale, title, description, canonicalPath, alternatePath?, image? }`
- Consumes: `Locale`, `localizedPath()`

- [ ] **Step 1: Extend failing route tests**

Add to `tests/unit/i18n.test.ts`:

```ts
import { routeFor } from "../../src/lib/urls";

it("builds localized structural and detail routes", () => {
  expect(routeFor("zh", "publications")).toBe("/publications/");
  expect(routeFor("en", "projects", "robust-fs")).toBe("/en/projects/robust-fs/");
  expect(routeFor("zh", "blog", "reproducible-experiments")).toBe("/blog/reproducible-experiments/");
});
```

- [ ] **Step 2: Verify the route test fails**

Run: `pnpm vitest run tests/unit/i18n.test.ts`

Expected: FAIL because `routeFor()` does not exist.

- [ ] **Step 3: Implement route mapping**

Create `src/lib/urls.ts` with one explicit route map. Append a validated slug only for `projects` and `blog`, and prefix Astro's configured base so the same code works for user Pages sites, project Pages sites, and custom domains:

```ts
import { localizedPath, type Locale } from "./i18n";

type RouteKind = "home" | "about" | "publications" | "projects" | "blog";

const ROUTES: Record<RouteKind, string> = {
  home: "/",
  about: "/about/",
  publications: "/publications/",
  projects: "/projects/",
  blog: "/blog/"
};

const DETAIL_ROUTES = new Set<RouteKind>(["projects", "blog"]);
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function withBase(path: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

export function routeFor(locale: Locale, kind: RouteKind, slug?: string): string {
  if (slug !== undefined && (!DETAIL_ROUTES.has(kind) || !SAFE_SLUG.test(slug))) {
    throw new Error("invalid slug for route");
  }
  if (DETAIL_ROUTES.has(kind) && slug === "") {
    throw new Error("slug cannot be empty");
  }
  const logicalPath = slug ? `${ROUTES[kind]}${slug}/` : ROUTES[kind];
  return withBase(localizedPath(locale, logicalPath));
}

export function assetUrl(path: string): string {
  return path.startsWith("/") ? withBase(path) : path;
}
```

Index routes omit `slug`; detail routes pass it explicitly. This keeps `/projects/` valid while rejecting malformed detail identifiers.

- [ ] **Step 4: Implement shared layout components**

`Header.astro` must render exactly the five approved navigation destinations plus the language switch. `LanguageSwitch.astro` must accept explicit current and alternate paths rather than guessing translations. `Footer.astro` may repeat contact and profile links but must not add a separate contact route.

`BaseLayout.astro` must:

- set `<html lang>` to `zh-CN` or `en`;
- import `src/styles/global.css`;
- render title, description, canonical, alternate hreflang, Open Graph, and Twitter metadata;
- include `Header`, main content, and `Footer`;
- expose a skip-to-content link and visible focus state;
- avoid loading CMS scripts or analytics on public pages.

- [ ] **Step 5: Run tests and type checking**

Run:

```bash
pnpm vitest run tests/unit/i18n.test.ts
pnpm check
```

Expected: PASS and no invalid route or component props.

- [ ] **Step 6: Commit**

```bash
git add src/lib/urls.ts src/components/Header.astro src/components/Footer.astro src/components/LanguageSwitch.astro src/layouts/BaseLayout.astro tests/unit/i18n.test.ts
git commit -m "feat: add bilingual site shell"
```

---

### Task 4: Approved Homepage and About Pages

**Files:**
- Create: `src/components/CountLinks.astro`
- Create: `src/views/HomePage.astro`
- Create: `src/views/AboutPage.astro`
- Create: `src/pages/index.astro`
- Create: `src/pages/en/index.astro`
- Create: `src/pages/about.astro`
- Create: `src/pages/en/about.astro`
- Create: `tests/e2e/site.spec.ts`

**Interfaces:**
- `HomePage` consumes `{ locale: Locale }` and the content selectors from Task 2.
- `AboutPage` consumes `{ locale: Locale }` and `getProfile()`.
- `CountLinks` consumes `{ publications: number; projects: number; posts: number; locale: Locale }`.

- [ ] **Step 1: Write failing homepage and about smoke tests**

Create `tests/e2e/site.spec.ts`:

```ts
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const route of ["/", "/en/", "/about/", "/en/about/"]) {
  test(`${route} renders without serious accessibility violations`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
  });
}

test("homepage shows linked live counts and no rejected sections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /论文成果/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /科研项目/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /博客文章/ })).toBeVisible();
  await expect(page.getByText("精选成果")).toHaveCount(0);
  await expect(page.getByText(/下载简历/)).toHaveCount(0);
});
```

- [ ] **Step 2: Install the browser and confirm failure**

Run:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

Expected: FAIL because the routes do not exist.

- [ ] **Step 3: Build the reusable homepage and about views**

Implement `HomePage.astro` as the approved academic-minimal layout: title/navigation shell, bilingual profile statement, portrait passed through `assetUrl()` with the locale-matched alternative text, three linked count cells, and two newest published posts. Do not render action buttons or a featured-results section. Implement `AboutPage.astro` with education, experience, honors, skills, service, contact, and external profiles as semantic sections.

Create thin route files that only pass `locale="zh"` or `locale="en"` to the appropriate view. Use the alternate locale route in `BaseLayout`.

- [ ] **Step 4: Verify desktop and mobile layouts**

Run: `pnpm test:e2e`

Expected: all four routes load, accessibility assertions pass, and rejected sections are absent in both Playwright projects.

- [ ] **Step 5: Commit**

```bash
git add src/components/CountLinks.astro src/views/HomePage.astro src/views/AboutPage.astro src/pages/index.astro src/pages/en/index.astro src/pages/about.astro src/pages/en/about.astro tests/e2e/site.spec.ts
git commit -m "feat: build academic homepage and profile"
```

---

### Task 5: Publications UI and Atomic BibTeX Import

**Files:**
- Create: `src/components/PublicationList.astro`
- Create: `src/views/PublicationsPage.astro`
- Create: `src/pages/publications.astro`
- Create: `src/pages/en/publications.astro`
- Create: `src/lib/bibtex.ts`
- Create: `scripts/import-bibtex.ts`
- Create: `tests/unit/bibtex.test.ts`
- Create: `tests/fixtures/bibtex/sample.bib`
- Create: `tests/fixtures/bibtex/updated.bib`
- Create: `tests/fixtures/bibtex/invalid.bib`
- Create: `imports/publications.bib`

**Interfaces:**
- Consumes: `normalizeDoi(value?: string): string | undefined` from `src/lib/identifiers.ts`
- Consumes: `fileStemForCitationKey(value: string): string` from `src/lib/identifiers.ts`
- Produces: `parseBibtex(source: string): ImportedPublication[]`
- Produces: `matchPublication(imported: ImportedPublication, existing: PublicationRecord[]): PublicationRecord | undefined`
- Produces: `mergePublication(imported: ImportedPublication, existing?: PublicationRecord): PublicationRecord`
- `PublicationList` consumes both profile names plus `profile.authorAliases` as the exact owner-name aliases to emphasize in author lists.
- Produces CLI example: `pnpm exec tsx scripts/import-bibtex.ts --input imports/publications.bib --output src/data/publications`

- [ ] **Step 1: Write failing DOI and merge tests**

Create `tests/unit/bibtex.test.ts` covering DOI normalization, DOI-first matching, citation-key fallback, preservation of CMS-owned fields, idempotency, and invalid-file rejection:

```ts
import { describe, expect, it } from "vitest";
import { matchPublication, mergePublication, parseBibtex } from "../../src/lib/bibtex";
import { fileStemForCitationKey, normalizeDoi } from "../../src/lib/identifiers";
import type { PublicationRecord } from "../../src/lib/schemas";

describe("normalizeDoi", () => {
  it("removes DOI URL prefixes and lowercases", () => {
    expect(normalizeDoi("https://doi.org/10.1000/ABC.1")).toBe("10.1000/abc.1");
  });
});

it("creates a portable filename stem from a citation key", () => {
  expect(fileStemForCitationKey("Wang:2026_RFS")).toBe("wang-2026-rfs");
});

describe("mergePublication", () => {
  it("updates bibliographic fields and preserves CMS fields", () => {
    const merged = mergePublication(
      { citationKey: "new-key", doi: "10.1000/x", title: "Imported", authors: ["A"], year: 2026, venue: "Venue", type: "journal" },
      { citationKey: "old-key", doi: "10.1000/x", title: "Old", authors: ["B"], year: 2025, venue: "Old Venue", type: "preprint", status: "published", titleZh: "中文题名", links: [{ label: "Code", url: "https://example.org/code" }], draft: false }
    );
    expect(merged.title).toBe("Imported");
    expect(merged.titleZh).toBe("中文题名");
    expect(merged.links).toHaveLength(1);
    expect(mergePublication(
      { citationKey: "new-key", doi: "10.1000/x", title: "Imported", authors: ["A"], year: 2026, venue: "Venue", type: "journal" },
      merged
    )).toEqual(merged);
  });
});

it("matches DOI before citation key", () => {
  const byKey: PublicationRecord = { citationKey: "incoming", doi: "10.1000/key", title: "Key", authors: ["A"], year: 2025, venue: "V", type: "journal", status: "published", links: [], draft: false };
  const byDoi: PublicationRecord = { citationKey: "different", doi: "10.1000/target", title: "DOI", authors: ["B"], year: 2026, venue: "V", type: "journal", status: "published", links: [], draft: false };
  const match = matchPublication(
    { citationKey: "incoming", doi: "10.1000/target", title: "New", authors: ["C"], year: 2026, venue: "V", type: "journal" },
    [byKey, byDoi]
  );
  expect(match?.title).toBe("DOI");
});

it("reports the citation key when required BibTeX data is missing", () => {
  expect(() => parseBibtex("@article{broken, title={Missing year}}"))
    .toThrow(/broken.*year/i);
});
```

- [ ] **Step 2: Confirm the tests fail**

Run: `pnpm vitest run tests/unit/bibtex.test.ts`

Expected: FAIL because `src/lib/bibtex.ts` does not exist.

- [ ] **Step 3: Implement parser and merge policy**

Use `@citation-js/core` plus `@citation-js/plugin-bibtex` in `parseBibtex()`. Convert parsed CSL records to the exact publication schema. Format each author as `given family`, retaining literal organization names. Map CSL `article-journal` to `journal`, `paper-conference` to `conference`, `article` to `preprint`, `book` to `book`, `chapter` to `chapter`, `thesis` to `thesis`, and all other types to `other`. Read venue from `container-title`, then `publisher`, then reject the record if both are absent. Read year from the first `issued.date-parts` value. Default status to `preprint` only for imported preprints and to `published` otherwise.

Treat title, authors, year, venue, type, and DOI as BibTeX-owned; preserve `titleZh`, abstracts, status when explicitly set, resource links, and `draft` from an existing CMS record. Normalize DOI before comparison.

Throw an error containing the citation key when required fields are absent. Return stable output sorted by citation key so repeated imports generate no diff.

- [ ] **Step 4: Implement atomic file output**

`scripts/import-bibtex.ts` must:

1. parse command-line `--input` and `--output`;
2. read every existing YAML publication into memory;
3. parse and validate every imported entry before writing;
4. merge by normalized DOI first, then citation key;
5. name newly imported files with `fileStemForCitationKey()` and reject collisions before writing;
6. copy the complete existing collection plus all merged records into a uniquely named temporary sibling directory;
7. import `publicationSchema` from `src/lib/schemas.ts` and validate every temporary YAML record with `publicationSchema.parse()`;
8. resolve and verify that the output, temporary, and backup directories all share the intended parent, then rename the existing output to the unique backup and rename the validated temporary directory to the output path;
9. restore the backup if the second rename fails, and remove the backup only after the swap succeeds;
10. exit non-zero without changing `src/data/publications` on any parse, validation, or pre-swap error.

The script must print created, updated, unchanged, and failed counts.

- [ ] **Step 5: Build the publication pages**

`PublicationList.astro` must group by year and provide client-side type/year filters without hiding content when JavaScript is disabled. Render original title, optional Chinese title, authors, venue, status, DOI, and configured resource links. Compare trimmed, case-folded author text against `profile.nameZh`, `profile.nameEn`, and every `profile.authorAliases` value; wrap only exact matches in `<strong>`. Build Chinese and English route wrappers around `PublicationsPage.astro`.

- [ ] **Step 6: Verify unit, build, and route tests**

Run:

```bash
pnpm vitest run tests/unit/bibtex.test.ts tests/unit/content.test.ts
pnpm exec tsx scripts/import-bibtex.ts --input tests/fixtures/bibtex/sample.bib --output .tmp/publications-test
pnpm exec tsx scripts/import-bibtex.ts --input tests/fixtures/bibtex/updated.bib --output .tmp/publications-test
pnpm build
```

Expected: unit tests PASS, the second import updates without duplicates, and both publication routes build.

- [ ] **Step 7: Commit**

```bash
git add src/components/PublicationList.astro src/views/PublicationsPage.astro src/pages/publications.astro src/pages/en/publications.astro src/lib/bibtex.ts src/lib/identifiers.ts scripts/import-bibtex.ts tests/unit/bibtex.test.ts tests/fixtures/bibtex imports/publications.bib
git commit -m "feat: add publications and BibTeX import"
```

---

### Task 6: Bilingual Research Projects

**Files:**
- Create: `src/lib/markdown.ts`
- Create: `src/components/ProjectCard.astro`
- Create: `src/views/ProjectsPage.astro`
- Create: `src/views/ProjectPage.astro`
- Create: `src/pages/projects/index.astro`
- Create: `src/pages/projects/[id].astro`
- Create: `src/pages/en/projects/index.astro`
- Create: `src/pages/en/projects/[id].astro`
- Modify: `tests/e2e/site.spec.ts`

**Interfaces:**
- Produces: `renderTrustedMarkdown(source: string, basePath?: string): { html: string; headings: Array<{ depth: number; id: string; text: string }> }` with raw HTML disabled and project-site paths prefixed.
- Project route consumes the shared YAML record and selects `titleZh/bodyZh` or `titleEn/bodyEn` by locale.

- [ ] **Step 1: Add failing project route tests**

Add tests asserting that the seed project `robust-feature-selection` creates `/projects/robust-feature-selection/` and `/en/projects/robust-feature-selection/`, each with the correct localized title, and that draft projects return 404/not generated.

- [ ] **Step 2: Run the project tests and verify failure**

Run: `pnpm test:e2e --grep "project"`

Expected: FAIL because project routes do not exist.

- [ ] **Step 3: Implement safe Markdown rendering and project views**

Implement `renderTrustedMarkdown()` with `micromark(source, { allowDangerousHtml: false })`, then use Cheerio to prefix root-relative `a[href]`, `img[src]`, and each local `source[srcset]` candidate with `basePath` (default `import.meta.env.BASE_URL`). Leave external, `mailto:`, `tel:`, and fragment-only values unchanged. Assign deterministic, collision-suffixed IDs to `h2` and `h3` elements and return their depth/text/ID records for the blog table of contents. `ProjectsPage.astro` renders published project cards; `ProjectPage.astro` renders localized title, summary, `html`, status, dates, role, links, associated publications, and language alternate. When a cover exists, pass it through `assetUrl()`, use the locale-matched cover alternative text, and fall back to the localized project title only when that field is empty.

Both `[id].astro` route files must use `getStaticPaths()` over published projects and return locale-specific props. Never generate a route for `draft: true`.

- [ ] **Step 4: Run project checks**

Run:

```bash
pnpm vitest run
pnpm test:e2e --grep "project"
pnpm build
```

Expected: bilingual project routes PASS and no raw HTML from project Markdown appears unescaped.

- [ ] **Step 5: Commit**

```bash
git add src/lib/markdown.ts src/components/ProjectCard.astro src/views/ProjectsPage.astro src/views/ProjectPage.astro src/pages/projects src/pages/en/projects tests/e2e/site.spec.ts
git commit -m "feat: add bilingual research projects"
```

---

### Task 7: Language-Aware Blog, Static Search, and RSS

**Files:**
- Create: `src/lib/search.ts`
- Create: `src/components/BlogExplorer.astro`
- Create: `src/layouts/PostLayout.astro`
- Create: `src/views/BlogIndexPage.astro`
- Create: `src/views/BlogPostPage.astro`
- Create: `src/pages/blog/index.astro`
- Create: `src/pages/blog/[...id].astro`
- Create: `src/pages/en/blog/index.astro`
- Create: `src/pages/en/blog/[...id].astro`
- Create: `src/pages/search-index.json.ts`
- Create: `src/pages/rss.xml.ts`
- Create: `src/pages/en/rss.xml.ts`
- Create: `tests/unit/search.test.ts`
- Modify: `tests/e2e/site.spec.ts`

**Interfaces:**
- Produces: `type SearchablePost = { id: string; language: Locale; title: string; summary: string; body: string; slug: string; category: string; tags: string[]; draft: boolean }`.
- Produces: `toSearchDocuments(posts: SearchablePost[]): SearchDocument[]`
- Search index response: `{ id, language, title, summary, category, tags, url, text }[]`
- Blog routes consume only posts whose `language` matches the route locale.

- [ ] **Step 1: Write failing search-document tests**

Test draft exclusion, language retention, URL generation, and plain-text extraction from Markdown:

```ts
import { expect, it } from "vitest";
import { toSearchDocuments } from "../../src/lib/search";

it("creates searchable documents only for published posts", () => {
  const docs = toSearchDocuments([
    { id: "a", language: "zh", title: "实验", summary: "摘要", body: "# 正文", slug: "experiment", category: "方法", tags: [], draft: false },
    { id: "b", language: "en", title: "Secret", summary: "Draft", body: "Hidden", slug: "secret", category: "Notes", tags: [], draft: true }
  ]);
  expect(docs).toHaveLength(1);
  expect(docs[0].url).toBe("/blog/experiment/");
});
```

- [ ] **Step 2: Confirm failure, then implement the pure index builder**

Run: `pnpm vitest run tests/unit/search.test.ts`

Expected before implementation: FAIL because `src/lib/search.ts` does not exist.

Implement Markdown-to-plain-text conversion that removes frontmatter, headings, links, code-fence markers, and excess whitespace without executing HTML.

- [ ] **Step 3: Implement blog pages and progressive enhancement**

`BlogIndexPage.astro` must render a server-built full list before JavaScript loads. `BlogExplorer.astro` enhances it with language, category, tag, and text-search controls using MiniSearch and `assetUrl("/search-index.json")`. If the script fails, all posts remain readable.

`BlogPostPage.astro` passes the retained Markdown body through `renderTrustedMarkdown()`; `PostLayout.astro` renders title, summary, dates, category, tags, a table of contents from the returned `headings`, rendered `html`, and related posts. When a cover exists, pass it through `assetUrl()`, use `coverAlt`, and fall back to the post title only when the field is empty. Generate only language-matching routes. Do not create empty translation routes; the language switch returns to the other language's blog index when no translated post exists.

- [ ] **Step 4: Add search index and two RSS feeds**

`search-index.json.ts` returns published posts across both languages with `Content-Type: application/json; charset=utf-8`. `rss.xml.ts` includes Chinese posts; `en/rss.xml.ts` includes English posts. Both use the configured `SITE_URL` and exclude drafts.

- [ ] **Step 5: Verify blog behavior**

Run:

```bash
pnpm vitest run tests/unit/search.test.ts
pnpm test:e2e --grep "blog|search|RSS"
pnpm build
```

Expected: language-filtered routes, fallback list, search, RSS, and build all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/search.ts src/components/BlogExplorer.astro src/layouts/PostLayout.astro src/views/BlogIndexPage.astro src/views/BlogPostPage.astro src/pages/blog src/pages/en/blog src/pages/search-index.json.ts src/pages/rss.xml.ts src/pages/en/rss.xml.ts tests/unit/search.test.ts tests/e2e/site.spec.ts
git commit -m "feat: add bilingual research blog and search"
```

---

### Task 8: Pages CMS Editing Experience and BibTeX Action

**Files:**
- Create: `.pages.yml`
- Create: `.github/workflows/import-publications.yml`
- Create or modify: `README.md`

**Interfaces:**
- Consumes content directories and field names from Task 2.
- Produces CMS collections `profile`, `publications`, `projects`, and `blog`.
- Produces Pages CMS action `import-publications` backed by `.github/workflows/import-publications.yml`.

- [ ] **Step 1: Create the Pages CMS configuration**

Create `.pages.yml` with the exact media sources, reusable fields, content editors, commit messages, and action below. The field names intentionally mirror `src/content.config.ts`; changing either side requires changing the other in the same commit.

```yaml
media:
  - name: images
    label: 图片
    input: public/media
    output: /media
    rename: safe
    extensions: [png, jpg, jpeg, webp, avif, svg]
  - name: bibtex
    label: BibTeX 导入文件
    input: imports
    output: /imports
    rename: false
    extensions: [bib]

components:
  link:
    type: object
    fields:
      - { name: label, label: 链接名称, type: string, required: true }
      - { name: url, label: URL, type: string, required: true }
  localizedItem:
    type: object
    fields:
      - { name: titleZh, label: 中文标题, type: string, required: true }
      - { name: titleEn, label: English title, type: string, required: true }
      - { name: detailZh, label: 中文说明, type: text, required: true }
      - { name: detailEn, label: English detail, type: text, required: true }
      - { name: start, label: 开始时间, type: string }
      - { name: end, label: 结束时间, type: string }

content:
  - name: profile
    label: 个人资料 / Profile
    type: file
    path: src/data/profile/profile.yaml
    format: yaml
    operations: { delete: false, rename: false }
    fields:
      - { name: nameZh, label: 中文姓名, type: string, required: true }
      - { name: nameEn, label: English name, type: string, required: true }
      - { name: roleZh, label: 中文身份, type: string, required: true }
      - { name: roleEn, label: English role, type: string, required: true }
      - { name: statementZh, label: 中文简介, type: text, required: true }
      - { name: statementEn, label: English statement, type: text, required: true }
      - { name: bioZh, label: 中文详细介绍, type: rich-text, required: true, options: { format: markdown, media: images } }
      - { name: bioEn, label: English biography, type: rich-text, required: true, options: { format: markdown, media: images } }
      - { name: interestsZh, label: 中文研究兴趣, type: string, list: true }
      - { name: interestsEn, label: English interests, type: string, list: true }
      - { name: portrait, label: 头像, type: image, required: true, options: { media: images } }
      - { name: portraitAltZh, label: 头像中文替代文字, type: string, required: true }
      - { name: portraitAltEn, label: Portrait alt text, type: string, required: true }
      - { name: education, label: 教育经历, component: localizedItem, list: true }
      - { name: experience, label: 工作经历, component: localizedItem, list: true }
      - { name: honors, label: 荣誉奖励, component: localizedItem, list: true }
      - { name: service, label: 学术服务, component: localizedItem, list: true }
      - { name: skillsZh, label: 中文技能, type: string, list: true }
      - { name: skillsEn, label: English skills, type: string, list: true }
      - { name: email, label: 邮箱, type: string, required: true }
      - { name: links, label: 外部链接, component: link, list: true }
      - { name: authorAliases, label: 论文作者名别名, type: string, list: true, description: 用于在作者列表中突出本人，例如姓名缩写形式 }

  - name: publications
    label: 论文成果 / Publications
    type: collection
    path: src/data/publications
    format: yaml
    filename: "{citationKey}.yaml"
    view:
      primary: title
      fields: [title, year, type, status, draft]
      sort: [year, title]
      search: [title, titleZh, authors, venue, citationKey, doi]
      default: { sort: year, order: desc }
    fields:
      - { name: citationKey, label: Citation key, type: string, required: true }
      - { name: doi, label: DOI, type: string }
      - { name: title, label: 论文标题, type: string, required: true }
      - { name: titleZh, label: 中文标题（可选）, type: string }
      - { name: authors, label: 作者, type: string, list: true, required: true }
      - { name: year, label: 年份, type: number, required: true }
      - { name: venue, label: 期刊或会议, type: string, required: true }
      - name: type
        label: 类型
        type: select
        required: true
        options:
          values: [journal, conference, preprint, book, chapter, thesis, other]
      - name: status
        label: 状态
        type: select
        required: true
        options:
          values: [published, accepted, in-press, preprint]
      - { name: volume, label: 卷, type: string }
      - { name: issue, label: 期, type: string }
      - { name: pages, label: 页码, type: string }
      - { name: abstractZh, label: 中文摘要, type: text }
      - { name: abstractEn, label: English abstract, type: text }
      - { name: links, label: 论文链接, component: link, list: true }
      - { name: draft, label: 草稿, type: boolean, default: false }

  - name: projects
    label: 科研项目 / Projects
    type: collection
    path: src/data/projects
    format: yaml-frontmatter
    filename: "{slug}.md"
    view:
      primary: titleZh
      fields: [titleZh, titleEn, start, status, draft]
      sort: [start, titleZh]
      search: [titleZh, titleEn, summaryZh, summaryEn, roleZh, roleEn]
      default: { sort: start, order: desc }
    fields:
      - { name: slug, label: URL 标识, type: string, required: true, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }
      - { name: titleZh, label: 中文标题, type: string, required: true }
      - { name: titleEn, label: English title, type: string, required: true }
      - { name: summaryZh, label: 中文摘要, type: text, required: true }
      - { name: summaryEn, label: English summary, type: text, required: true }
      - { name: bodyZh, label: 中文正文, type: rich-text, required: true, options: { format: markdown, media: images } }
      - { name: bodyEn, label: English body, type: rich-text, required: true, options: { format: markdown, media: images } }
      - { name: start, label: 开始日期, type: date, required: true, options: { format: yyyy-MM-dd } }
      - { name: end, label: 结束日期, type: date, default: "", options: { format: yyyy-MM-dd } }
      - name: status
        label: 状态
        type: select
        required: true
        options:
          values: [active, completed, paused]
      - { name: roleZh, label: 中文角色, type: string, required: true }
      - { name: roleEn, label: English role, type: string, required: true }
      - { name: cover, label: 封面, type: image, options: { media: images } }
      - { name: coverAltZh, label: 封面中文替代文字, type: string }
      - { name: coverAltEn, label: Cover alt text, type: string }
      - { name: links, label: 项目链接, component: link, list: true }
      - { name: publicationKeys, label: 关联 citation keys, type: string, list: true }
      - { name: draft, label: 草稿, type: boolean, default: false }

  - name: blog
    label: 博客文章 / Blog
    type: collection
    path: src/data/blog
    format: yaml-frontmatter
    filename: "{slug}.md"
    view:
      primary: title
      fields: [title, language, publishedAt, category, draft]
      sort: [publishedAt, title]
      search: [title, summary, category, tags]
      default: { sort: publishedAt, order: desc }
    fields:
      - name: language
        label: 文章语言
        type: select
        required: true
        options:
          values:
            - { name: zh, label: 中文 }
            - { name: en, label: English }
      - { name: title, label: 标题, type: string, required: true }
      - { name: summary, label: 摘要, type: text, required: true }
      - { name: slug, label: URL 标识, type: string, required: true, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$" }
      - { name: publishedAt, label: 发布时间, type: date, required: true, options: { time: true, format: "yyyy-MM-dd'T'HH:mm" } }
      - { name: updatedAt, label: 更新时间, type: date, default: "", options: { time: true, format: "yyyy-MM-dd'T'HH:mm" } }
      - { name: category, label: 分类, type: string, required: true }
      - { name: tags, label: 标签, type: string, list: true }
      - { name: cover, label: 封面, type: image, options: { media: images } }
      - { name: coverAlt, label: 封面替代文字, type: string }
      - { name: draft, label: 草稿, type: boolean, default: true }
      - { name: body, label: 正文, type: rich-text, required: true, options: { format: markdown, media: images } }

settings:
  commit:
    identity: user
    templates:
      create: "content(create): {path}"
      update: "content(update): {path}"
      delete: "content(delete): {path}"
      rename: "content(rename): {oldPath} -> {newPath}"

actions:
  - name: import-publications
    label: 导入或更新 BibTeX
    workflow: import-publications.yml
    ref: current
    cancelable: false
    confirm:
      title: 导入论文？
      message: 将 imports/publications.bib 合并到论文集合；失败时不会写入部分结果。
      button: 开始导入
```

- [ ] **Step 2: Create the manual import workflow**

Create `.github/workflows/import-publications.yml`:

```yaml
name: Import publications

on:
  workflow_dispatch:
    inputs:
      payload:
        description: Pages CMS action context
        required: true
        type: string

permissions:
  contents: write

concurrency:
  group: import-publications-${{ github.ref }}
  cancel-in-progress: false

jobs:
  import:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec tsx scripts/import-bibtex.ts --input imports/publications.bib --output src/data/publications
      - run: pnpm check
      - run: pnpm test:unit
      - run: pnpm build
      - name: Commit imported publications
        run: |
          if git diff --quiet -- src/data/publications; then exit 0; fi
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add src/data/publications
          git commit -m "content(publications): import BibTeX"
          git push
```

- [ ] **Step 3: Validate CMS field compatibility**

Add a “内容维护” section to `README.md` that links to `https://app.pagescms.org/`, states that edits become Git commits and trigger validation, links to `docs/CONTENT-GUIDE.md`, and warns that drafts in this public repository are not confidential.

Open the hosted Pages CMS app, install its GitHub App only for the target repository, and verify:

1. profile edits preserve one YAML mapping whose root keys exactly match the profile schema;
2. publications save valid YAML and enums;
3. projects save YAML frontmatter with both language bodies in the matching rich-text fields;
4. blog saves frontmatter plus Markdown body;
5. image uploads produce URLs beginning with `/media/`;
6. `publications.bib` can be replaced without renaming;
7. the import action starts the exact workflow above.

- [ ] **Step 4: Run the full local content check**

Run: `pnpm verify`

Expected: configuration-adjacent content builds and all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add .pages.yml .github/workflows/import-publications.yml README.md
git commit -m "feat: configure Pages CMS editing"
```

---

### Task 9: CI, Safe GitHub Pages Deployment, and Generated-Site Verification

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`
- Create: `scripts/verify-dist.ts`
- Create: `tests/unit/verify-dist.test.ts`
- Create: `src/pages/404.astro`
- Modify: `package.json`
- Modify: `tests/e2e/site.spec.ts`

**Interfaces:**
- `verify-dist.ts` exports `verifyDist(root: string, basePath?: string)` and exits non-zero for missing images or broken internal links while emitting warnings for external URLs without fetching them.
- Deployment consumes `dist/` only after check, unit tests, build, and verification pass.

- [ ] **Step 1: Write a failing generated-site verification fixture test**

Create `tests/unit/verify-dist.test.ts`. It must build its fixture only inside the operating system temporary directory and clean up that exact directory after the assertion:

```ts
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { verifyDist } from "../../scripts/verify-dist";

const cleanup: string[] = [];

afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("verifyDist", () => {
  it("reports a missing internal route", async () => {
    const root = await mkdtemp(join(tmpdir(), "research-site-dist-"));
    cleanup.push(root);
    await mkdir(join(root, "present"));
    await writeFile(join(root, "present", "index.html"), "<p>Present</p>", "utf8");
    await writeFile(join(root, "index.html"), '<a href="/present/">ok</a><a href="/missing/">broken</a>', "utf8");

    const result = await verifyDist(root);

    expect(result).toEqual({
      ok: false,
      brokenInternal: [{ url: "/missing/", referrer: "index.html" }],
      missingAssets: []
    });
  });
});
```

Export `verifyDist(root: string, basePath = "/"): Promise<VerifyResult>` from `scripts/verify-dist.ts`, where both `brokenInternal` and `missingAssets` contain `{ url: string; referrer: string }` records, and guard CLI execution by comparing `import.meta.url` with the current process entry URL.

- [ ] **Step 2: Confirm the test fails, then implement the verifier**

Run: `pnpm vitest run tests/unit/verify-dist.test.ts`

Expected before implementation: FAIL on the new `verifyDist` import.

Implement `verifyDist()` with Cheerio, not regular expressions. Recursively inspect `.html` files; parse `a[href]`, `img[src]`, and `source[srcset]`; resolve root-relative URLs after removing `basePath`; resolve trailing-slash routes to `index.html`; strip query strings and fragments; ignore `mailto:`, `tel:`, fragment-only, and external URLs; sort and deduplicate results. The CLI derives `basePath` from the pathname of `SITE_URL` (falling back to `/`), calls `verifyDist("dist", basePath)`, prints every failure with its referring HTML file, and exits with status 1 when `ok` is false. Do not fetch external URLs in CI.

- [ ] **Step 3: Add a localized 404 page and final route assertions**

Create `src/pages/404.astro` with Chinese and English explanations and links to both homepages. Extend Playwright coverage for navigation, language links, counts, publication filters, project routes, blog search fallback, RSS responses, and 404 navigation.

- [ ] **Step 4: Create pull-request CI**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches-ignore: [main]

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
      - run: pnpm test:unit
      - run: pnpm build
        env:
          SITE_URL: ${{ vars.SITE_URL }}
      - run: pnpm exec tsx scripts/verify-dist.ts
        env:
          SITE_URL: ${{ vars.SITE_URL }}
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
```

- [ ] **Step 5: Create safe GitHub Pages deployment**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
      - run: pnpm test:unit
      - name: Validate production site URL
        run: node -e "const value=process.env.SITE_URL||''; if(!value.startsWith('https://')||value.endsWith('/')){console.error('SITE_URL must be an https URL without a trailing slash'); process.exit(1)}"
        env:
          SITE_URL: ${{ vars.SITE_URL }}
      - run: pnpm build
        env:
          SITE_URL: ${{ vars.SITE_URL }}
      - run: pnpm exec tsx scripts/verify-dist.ts
        env:
          SITE_URL: ${{ vars.SITE_URL }}
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v5
```

Before the first public deploy, create repository variable `SITE_URL` with the complete public site base URL and no trailing slash. For a project site this includes the repository pathname, for example `https://researcher.github.io/research-site`; for a user site or custom domain it is the origin. A later custom domain changes this variable and adds `public/CNAME`.

- [ ] **Step 6: Verify locally and in a pull request**

Run locally:

```bash
pnpm verify
pnpm test:e2e
```

Then push a branch and confirm `ci.yml` passes. Deliberately break one internal link on the branch, confirm CI fails with the source path, restore the link, and confirm CI passes.

- [ ] **Step 7: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/deploy.yml scripts/verify-dist.ts src/pages/404.astro package.json tests
git commit -m "ci: add verified GitHub Pages deployment"
```

---

### Task 10: Operations Guide and Launch Acceptance

**Files:**
- Create: `docs/CONTENT-GUIDE.md`
- Create: `docs/OPERATIONS.md`
- Create: `docs/images/cms-edit-profile.png`
- Create: `docs/images/cms-import-bibtex.png`
- Create: `docs/images/actions-build-status.png`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-09-04-research-blog-design.md` only if implementation discoveries require an approved clarification

**Interfaces:**
- Produces owner-facing procedures for routine editing, BibTeX import, failed builds, rollback, dependency updates, and future content types.

- [ ] **Step 1: Write the content guide**

Document these exact workflows. Capture and redact the three listed screenshots so they show the profile editor, BibTeX import action, and build status without exposing account email, tokens, or unrelated repositories:

1. sign into hosted Pages CMS with GitHub;
2. edit bilingual profile text;
3. add/update a publication manually;
4. upload `publications.bib` and run the import action;
5. add a bilingual project;
6. create a Chinese or English blog post;
7. use `draft: true` and understand that the source remains public;
8. upload/replace an image with descriptive alternative text;
9. read build status after saving.

- [ ] **Step 2: Write the operations guide**

Document:

- normal save-to-deploy timing and where Actions status appears;
- how to identify content-schema, build, internal-link, BibTeX, and Playwright failures;
- how to correct a failed CMS edit;
- how to revert a specific content commit through GitHub without rewriting history;
- how to re-run a failed workflow;
- how to rotate/restrict the Pages CMS GitHub App installation;
- how to update dependencies on a branch and run `pnpm verify`;
- how to add a future content type without changing existing collection formats;
- how to add a custom domain by setting DNS, `public/CNAME`, and `SITE_URL`.

- [ ] **Step 3: Complete launch acceptance**

Verify all of the following against the deployed Pages URL:

```text
[ ] Chinese and English home/about/publications/projects/blog routes load
[ ] Language switches point to real pages
[ ] Homepage has portrait, statement, live counts, and two latest posts
[ ] Homepage has no featured-results block, duplicate CTA row, or CV download
[ ] About page shows approved text and contact links
[ ] Publication filters and all configured resource links work
[ ] BibTeX import is idempotent and atomic
[ ] Project pages render both languages from one record
[ ] Blog language/category/tag filters and static search work
[ ] Draft content is absent from pages, counts, search, RSS, and sitemap
[ ] Desktop and mobile Playwright suites pass
[ ] Serious and critical axe violations equal zero
[ ] A deliberately failed build leaves the previous deployment online
[ ] Pages CMS GitHub App is limited to the website repository
[ ] No secrets or confidential research files are tracked
```

- [ ] **Step 4: Run final verification**

Run:

```bash
pnpm verify
pnpm test:e2e
git status --short
```

Expected: all commands exit 0 and only intentionally edited documentation files remain before commit.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/CONTENT-GUIDE.md docs/OPERATIONS.md docs/images
git commit -m "docs: add research site operations guide"
```

---

## Execution Checkpoints

- After Task 2: review the content schemas and owner-provided seed content before building pages.
- After Task 4: compare desktop and mobile home/about pages with the approved academic-minimal mockup.
- After Task 5: review one manual publication and one BibTeX-imported publication side by side.
- After Task 8: have the owner perform one edit and one BibTeX action in Pages CMS.
- After Task 9: inspect a successful preview and one intentional failure before enabling production Pages deployment.
- After Task 10: run the launch checklist with the owner and only then treat the site as production-ready.
