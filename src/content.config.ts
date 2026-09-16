import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { blogSchema, profileSchema, projectSchema, publicationSchema, resourceSchema } from "./lib/schemas";

/** Keep collection identities tied to their source files; public URLs use schema slugs. */
export function sourceFileEntryId({ entry }: { entry: string }): string {
  return entry;
}

const profile = defineCollection({
  loader: glob({ pattern: "profile.{yaml,yml}", base: "./src/data/profile" }),
  schema: profileSchema
});
const publications = defineCollection({
  loader: glob({ pattern: "**/*.{yaml,yml}", base: "./src/data/publications" }),
  schema: publicationSchema
});
const projects = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/data/projects",
    generateId: sourceFileEntryId
  }),
  schema: projectSchema
});
const blog = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/data/blog",
    retainBody: true,
    generateId: sourceFileEntryId
  }),
  schema: blogSchema
});
const resources = defineCollection({
  loader: glob({
    pattern: "**/*.{yaml,yml}",
    base: "./src/data/resources",
    generateId: sourceFileEntryId
  }),
  schema: resourceSchema
});

export const collections = { profile, publications, projects, blog, resources };
