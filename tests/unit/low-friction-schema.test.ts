import { expect, it } from "vitest";
import { blogSchema, profileSchema, projectSchema, publicationSchema, resourceSchema } from "../../src/lib/schemas";
import { fallbackSlug } from "../../src/lib/content";

it("accepts a minimally entered profile without fabricating contact data", () => {
  const profile = profileSchema.parse({});
  expect(profile.nameZh).toBe("未命名学者");
  expect(profile.email).toBe("");
  expect(profile.portrait).toBe("");
});

it("accepts minimal manual records with neutral defaults", () => {
  expect(publicationSchema.parse({ title: "新成果" })).toMatchObject({
    title: "新成果", authors: [], year: 0, type: "other", status: "pending"
  });
  expect(projectSchema.parse({ titleZh: "新项目" })).toMatchObject({
    slug: "", titleZh: "新项目", titleEn: "Details forthcoming", start: "", status: "pending"
  });
  expect(resourceSchema.parse({ title: "新资源" })).toMatchObject({
    language: "zh", slug: "", type: "other", title: "新资源", links: [], files: []
  });
  expect(blogSchema.parse({ title: "新文章" })).toMatchObject({
    language: "zh", slug: "", title: "新文章", category: "未分类"
  });
});

it("continues to reject unsafe links when a link is provided", () => {
  expect(resourceSchema.safeParse({ title: "新资源", links: [{ label: "危险", url: "javascript:alert(1)" }] }).success).toBe(false);
});

it("derives stable route-safe slugs from CMS-managed filenames", () => {
  expect(fallbackSlug("2026-09-16-research-note.md", "post")).toBe("2026-09-16-research-note");
  expect(fallbackSlug("研究记录.md", "post")).toMatch(/^post-[a-z0-9]+$/);
});
