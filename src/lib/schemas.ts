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
  nameZh: z.string().default("未命名学者"), nameEn: z.string().default("Unnamed scholar"),
  roleZh: z.string().default("研究者"), roleEn: z.string().default("Researcher"),
  statementZh: z.string().default("简介待补充"), statementEn: z.string().default("Details forthcoming"),
  bioZh: z.string().default("简介待补充"), bioEn: z.string().default("Details forthcoming"),
  interestsZh: z.array(z.string().min(1)).default([]), interestsEn: z.array(z.string().min(1)).default([]),
  portrait: z.string().default(""), portraitAltZh: z.string().default(""), portraitAltEn: z.string().default(""),
  education: z.array(localizedItem).default([]), experience: z.array(localizedItem).default([]),
  honors: z.array(localizedItem).default([]), service: z.array(localizedItem).default([]),
  skillsZh: z.array(z.string().min(1)).default([]), skillsEn: z.array(z.string().min(1)).default([]),
  email: z.preprocess((value) => value === "" ? undefined : value, z.string().email().optional()).default(""), links: z.array(link).default([]), authorAliases: z.array(z.string().min(1)).default([])
});
const resourceFile = z.string().regex(/^\/media\/resources\/[A-Za-z0-9._/-]+$/);

export const publicationSchema = z.object({
  citationKey: z.string().default(""), doi, title: z.string().default("未命名论文"), titleZh: z.string().optional(),
  authors: z.array(z.string().min(1)).default([]), year: z.number().int().min(1000).max(9999).default(0), venue: z.string().default(""),
  type: z.enum(["journal", "conference", "preprint", "book", "chapter", "thesis", "other"]).default("other"),
  status: z.enum(["published", "accepted", "in-press", "preprint", "pending"]).default("pending"),
  volume: z.string().optional(), issue: z.string().optional(), pages: z.string().optional(),
  abstractZh: z.string().optional(), abstractEn: z.string().optional(), links: z.array(publicationLink).default([]),
  draft: z.boolean().default(false)
});

export const importedPublicationSchema = publicationSchema.pick({
  citationKey: true, doi: true, title: true, authors: true, year: true, venue: true,
  type: true, volume: true, issue: true, pages: true, status: true
}).partial({ status: true });

export const projectSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).default(""),
  titleZh: z.string().default("未命名项目"), titleEn: z.string().default("Details forthcoming"), summaryZh: z.string().default("简介待补充"), summaryEn: z.string().default("Details forthcoming"),
  bodyZh: z.string().default(""), bodyEn: z.string().default(""), start: z.union([isoDate, z.literal("")]).default(""), end: optionalIsoDate,
  status: z.enum(["active", "completed", "paused", "pending"]).default("pending"), roleZh: z.string().default("待补充"), roleEn: z.string().default("Details forthcoming"),
  cover: z.string().optional(), coverAltZh: z.string().default(""), coverAltEn: z.string().default(""),
  links: z.array(projectLink).default([]), publicationKeys: z.array(z.string()).default([]),
  draft: z.boolean().default(false)
});

export const resourceSchema = z.object({
  language: z.enum(["zh", "en"]).default("zh"),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).default(""),
  type: z.enum(["dataset", "software", "code", "other"]).default("other"),
  title: z.string().default("未命名资源"),
  summary: z.string().default("简介待补充"),
  links: z.array(resourceLink).default([]),
  files: z.array(resourceFile).default([]),
  citation: z.string().min(1).optional(),
  draft: z.boolean().default(false)
});

export const blogSchema = z.object({
  language: z.enum(["zh", "en"]).default("zh"), title: z.string().default("未命名文章"), summary: z.string().default("简介待补充"),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).default(""), publishedAt: z.coerce.date().default(() => new Date()), updatedAt: optionalDate,
  category: z.string().default("未分类"), tags: z.array(z.string().min(1)).default([]),
  cover: z.string().optional(), coverAlt: z.string().default(""), draft: z.boolean().default(true)
});

export type Profile = z.infer<typeof profileSchema>;
export type PublicationRecord = z.infer<typeof publicationSchema>;
export type ProjectRecord = z.infer<typeof projectSchema>;
export type ResourceRecord = z.infer<typeof resourceSchema>;
export type BlogPostRecord = z.infer<typeof blogSchema>;
