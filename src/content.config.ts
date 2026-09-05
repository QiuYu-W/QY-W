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
  loader: glob({
    pattern: "**/*.md",
    base: "./src/data/blog",
    retainBody: true,
    generateId: ({ data, entry }) => {
      const language = typeof data.language === "string" ? data.language : "unknown";
      const slug = typeof data.slug === "string" ? data.slug : entry;
      return `${language}-${slug}`;
    }
  }),
  schema: blogSchema
});

export const collections = { profile, publications, projects, blog };
