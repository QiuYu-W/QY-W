import type { CollectionEntry } from "astro:content";
import type { Locale } from "./i18n";
import { fileStemForCitationKey, normalizeDoi } from "./identifiers";
import type { Profile } from "./schemas";

export type Publication = CollectionEntry<"publications">;
export type Project = CollectionEntry<"projects">;
export type BlogPost = CollectionEntry<"blog">;
export type Resource = CollectionEntry<"resources">;

export type ContentIdentityInput = {
  publications: Array<{ id: string; citationKey: string; doi?: string }>;
  projects: Array<{ id: string; slug: string }>;
  posts: Array<{ id: string; language: Locale; slug: string }>;
  resources?: Array<{ id: string; slug: string }>;
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

/** Make legacy manually-entered slugs optional without making public routes ambiguous. */
export function fallbackSlug(id: string, prefix: string): string {
  const stem = id.replace(/\.[^.]+$/, "").toLowerCase();
  const readable = stem.normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (readable) return readable;
  let hash = 5381;
  for (const character of id) hash = ((hash << 5) + hash) ^ character.charCodeAt(0);
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

function resolvedSlug(id: string, slug: string, prefix: string): string {
  return slug || fallbackSlug(id, prefix);
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
  assertNoDuplicate((input.resources ?? []).map(({ id, slug }) => ({ id, value: slug.trim().toLowerCase() })), "resource slug");
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
    (left, right) => (new Date(right.start).getTime() || 0) - (new Date(left.start).getTime() || 0) || left.slug.localeCompare(right.slug)
  );
}

function identityInput(publications: Publication[], projects: Project[], posts: BlogPost[], resources: Resource[]): ContentIdentityInput {
  return {
    publications: publications.map(({ id, data }) => ({ id, citationKey: data.citationKey, doi: data.doi })),
    projects: projects.map(({ id, data }) => ({ id, slug: resolvedSlug(id, data.slug, "project") })),
    posts: posts.map(({ id, data }) => ({ id, language: data.language, slug: resolvedSlug(id, data.slug, "post") })),
    resources: resources.map(({ id, data }) => ({ id, slug: resolvedSlug(id, data.slug, "resource") }))
  };
}

async function getValidatedCollections(): Promise<[Publication[], Project[], BlogPost[], Resource[]]> {
  const { getCollection } = await import("astro:content");
  const [publications, projects, posts, resources] = await Promise.all([
    getCollection("publications"),
    getCollection("projects"),
    getCollection("blog"),
    getCollection("resources")
  ]);
  assertUniqueContentIdentifiers(identityInput(publications, projects, posts, resources));
  return [publications, projects, posts, resources];
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
    slug: resolvedSlug(entry.id, entry.data.slug, "project")
  }))).map(({ start: _start, slug, ...entry }) => ({ ...entry, data: { ...entry.data, slug } }));
}

export async function getPublishedPosts(locale?: Locale): Promise<BlogPost[]> {
  const [, , posts] = await getValidatedCollections();
  return sortPostsNewestFirst(posts.filter(({ data }) => data.draft !== true && (!locale || data.language === locale)).map((entry) => ({
    ...entry,
    publishedAt: entry.data.publishedAt,
    slug: resolvedSlug(entry.id, entry.data.slug, "post")
  }))).map(({ publishedAt: _publishedAt, slug, ...entry }) => ({ ...entry, data: { ...entry.data, slug } }));
}

export async function getPublishedResources(): Promise<Resource[]> {
  const [, , , resources] = await getValidatedCollections();
  return [...resources]
    .filter(({ data }) => data.draft !== true)
    .sort((left, right) => left.data.title.localeCompare(right.data.title));
}

export async function getHomepageCounts(): Promise<{ publications: number; projects: number; posts: number }> {
  const [publications, projects, posts] = await getValidatedCollections();
  return {
    publications: countPublished(publications.map(({ data }) => data)),
    projects: countPublished(projects.map(({ data }) => data)),
    posts: countPublished(posts.map(({ data }) => data))
  };
}
