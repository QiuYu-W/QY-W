import type { CollectionEntry } from "astro:content";
import type { Locale } from "./i18n";
import { fileStemForCitationKey, normalizeDoi } from "./identifiers";
import type { Profile } from "./schemas";

export type Publication = CollectionEntry<"publications">;
export type Project = CollectionEntry<"projects">;
export type BlogPost = CollectionEntry<"blog">;

export type ContentIdentityInput = {
  publications: Array<{ id: string; citationKey: string; doi?: string }>;
  projects: Array<{ id: string; slug: string }>;
  posts: Array<{ id: string; language: Locale; slug: string }>;
};

function assertNoDuplicate(values: Array<{ id: string; value?: string }>, label: string): void {
  const seen = new Map<string, string>();
  for (const { id, value } of values) {
    if (!value) continue;
    const previousId = seen.get(value);
    if (previousId) {
      throw new Error(`Duplicate ${label} between entry IDs \"${previousId}\" and \"${id}\"`);
    }
    seen.set(value, id);
  }
}

/** Reject identifiers that would make a record ambiguous in a public URL or import. */
export function assertUniqueContentIdentifiers(input: ContentIdentityInput): void {
  assertNoDuplicate(
    input.publications.map(({ id, doi }) => ({ id, value: normalizeDoi(doi) })),
    "DOI"
  );
  assertNoDuplicate(
    input.publications.map(({ id, citationKey }) => ({ id, value: citationKey.trim().toLowerCase() })),
    "citation key"
  );
  assertNoDuplicate(
    input.publications.map(({ id, citationKey }) => ({ id, value: fileStemForCitationKey(citationKey) })),
    "citation-key file stem"
  );
  assertNoDuplicate(
    input.projects.map(({ id, slug }) => ({ id, value: slug.trim().toLowerCase() })),
    "project slug"
  );
  assertNoDuplicate(
    input.posts.map(({ id, language, slug }) => ({ id, value: `${language}:${slug.trim().toLowerCase()}` })),
    "blog language-and-slug"
  );
}

export function countPublished(items: Array<{ draft?: boolean }>): number {
  return items.filter((item) => item.draft !== true).length;
}

export function sortPublicationsNewestFirst<T extends { year: number; title: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => right.year - left.year || left.title.localeCompare(right.title));
}

export function sortPostsNewestFirst<T extends { publishedAt: Date; slug: string }>(items: T[]): T[] {
  return [...items].sort(
    (left, right) => right.publishedAt.getTime() - left.publishedAt.getTime() || left.slug.localeCompare(right.slug)
  );
}

export function sortProjectsNewestFirst<T extends { start: string; slug: string }>(items: T[]): T[] {
  return [...items].sort(
    (left, right) => new Date(right.start).getTime() - new Date(left.start).getTime() || left.slug.localeCompare(right.slug)
  );
}

function identityInput(publications: Publication[], projects: Project[], posts: BlogPost[]): ContentIdentityInput {
  return {
    publications: publications.map(({ id, data }) => ({ id, citationKey: data.citationKey, doi: data.doi })),
    projects: projects.map(({ id, data }) => ({ id, slug: data.slug })),
    posts: posts.map(({ id, data }) => ({ id, language: data.language, slug: data.slug }))
  };
}

async function getValidatedCollections(): Promise<[Publication[], Project[], BlogPost[]]> {
  const { getCollection } = await import("astro:content");
  const [publications, projects, posts] = await Promise.all([
    getCollection("publications"),
    getCollection("projects"),
    getCollection("blog")
  ]);
  assertUniqueContentIdentifiers(identityInput(publications, projects, posts));
  return [publications, projects, posts];
}

export async function getProfile(): Promise<Profile> {
  const { getCollection } = await import("astro:content");
  const [entries] = await Promise.all([getCollection("profile"), getValidatedCollections()]);
  if (entries.length !== 1) {
    throw new Error(`Expected exactly one profile record, found ${entries.length}`);
  }
  return entries[0].data;
}

export async function getPublishedPublications(): Promise<Publication[]> {
  const [publications] = await getValidatedCollections();
  return sortPublicationsNewestFirst(publications.filter(({ data }) => data.draft !== true).map((entry) => ({
    ...entry,
    year: entry.data.year,
    title: entry.data.title
  }))).map(({ year: _year, title: _title, ...entry }) => entry);
}

export async function getPublishedProjects(): Promise<Project[]> {
  const [, projects] = await getValidatedCollections();
  return sortProjectsNewestFirst(projects.filter(({ data }) => data.draft !== true).map((entry) => ({
    ...entry,
    start: entry.data.start,
    slug: entry.data.slug
  }))).map(({ start: _start, slug: _slug, ...entry }) => entry);
}

export async function getPublishedPosts(locale?: Locale): Promise<BlogPost[]> {
  const [, , posts] = await getValidatedCollections();
  return sortPostsNewestFirst(posts.filter(({ data }) => data.draft !== true && (!locale || data.language === locale)).map((entry) => ({
    ...entry,
    publishedAt: entry.data.publishedAt,
    slug: entry.data.slug
  }))).map(({ publishedAt: _publishedAt, slug: _slug, ...entry }) => entry);
}

export async function getHomepageCounts(): Promise<{ publications: number; projects: number; posts: number }> {
  const [publications, projects, posts] = await getValidatedCollections();
  return {
    publications: countPublished(publications.map(({ data }) => data)),
    projects: countPublished(projects.map(({ data }) => data)),
    posts: countPublished(posts.map(({ data }) => data))
  };
}
