import { z } from "astro/zod";
import { normalizeDoi } from "./identifiers";

const link = z.object({ label: z.string().min(1), url: z.string().url() });
// Publication resources are web pages/files. Other collections retain their
// existing link contract until their own rendering workflows are reviewed.
const publicationLink = link.extend({
  url: link.shape.url.refine((value) => /^https?:\/\//i.test(value), "Publication resource URLs must use explicit HTTP or HTTPS")
});
const projectLink = link.extend({
  url: link.shape.url.refine((value) => /^https?:\/\//i.test(value), "Project resource URLs must use explicit HTTP or HTTPS")
});
const resourceLink = z.object({
  label: z.string().min(1),
  url: z.string().refine(
    (value) => /^https:\/\//i.test(value) || (/^\/media\/[A-Za-z0-9._/-]+$/.test(value) && !value.includes("..")),
    "Resource URLs must use HTTPS, or a safe /media/ path"
  )
});
const localizedItem = z.object({
  titleZh: z.string().min(1),
  titleEn: z.string().min(1),
  detailZh: z.string().min(1),
  detailEn: z.string().min(1),
  start: z.string().optional(),
  end: z.string().optional()
});
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
  education: z.array(localizedItem), experience: z.array(localizedItem).default([]),
  honors: z.array(localizedItem).default([]), service: z.array(localizedItem).default([]),
  skillsZh: z.array(z.string().min(1)).default([]), skillsEn: z.array(z.string().min(1)).default([]),
  email: z.string().email(), links: z.array(link).default([]), authorAliases: z.array(z.string().min(1)).default([])
});

export const publicationSchema = z.object({
  citationKey: z.string().min(1), doi, title: z.string().min(1), titleZh: z.string().optional(),
  authors: z.array(z.string().min(1)).min(1), year: z.number().int().min(1000).max(9999), venue: z.string().min(1),
  type: z.enum(["journal", "conference", "preprint", "book", "chapter", "thesis", "other"]),
  status: z.enum(["published", "accepted", "in-press", "preprint"]),
  volume: z.string().optional(), issue: z.string().optional(), pages: z.string().optional(),
  abstractZh: z.string().optional(), abstractEn: z.string().optional(), links: z.array(publicationLink).default([]),
  draft: z.boolean().default(false)
});

export const importedPublicationSchema = publicationSchema.pick({
  citationKey: true, doi: true, title: true, authors: true, year: true, venue: true,
  type: true, volume: true, issue: true, pages: true, status: true
}).partial({ status: true });

export const projectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  titleZh: z.string().min(1), titleEn: z.string().min(1), summaryZh: z.string().min(1), summaryEn: z.string().min(1),
  bodyZh: z.string().min(1), bodyEn: z.string().min(1), start: isoDate, end: optionalIsoDate,
  status: z.enum(["active", "completed", "paused"]), roleZh: z.string().min(1), roleEn: z.string().min(1),
  cover: z.string().optional(), coverAltZh: z.string().default(""), coverAltEn: z.string().default(""),
  links: z.array(projectLink).default([]), publicationKeys: z.array(z.string()).default([]),
  draft: z.boolean().default(false)
});

export const resourceSchema = z.object({
  language: z.enum(["zh", "en"]),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  type: z.enum(["dataset", "software", "code", "other"]),
  title: z.string().min(1),
  summary: z.string().min(1),
  links: z.array(resourceLink).min(1),
  citation: z.string().min(1).optional(),
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
export type ResourceRecord = z.infer<typeof resourceSchema>;
export type BlogPostRecord = z.infer<typeof blogSchema>;
