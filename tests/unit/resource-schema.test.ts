import { expect, it } from "vitest";
import { resourceSchema } from "../../src/lib/schemas";

const resource = {
  language: "zh" as const,
  slug: "feature-selection-code",
  type: "code" as const,
  title: "特征选择代码",
  summary: "公开的研究实现。"
};

it("accepts published resources with HTTPS and CMS media links", () => {
  const parsed = resourceSchema.parse({
    ...resource,
    links: [
      { label: "GitHub", url: "https://github.com/QiuYu-W/QY-W" },
      { label: "下载", url: "/media/resources/package.zip" }
    ],
    citation: "请引用本文。"
  });

  expect(parsed.links).toHaveLength(2);
  expect(parsed.draft).toBe(false);
});

it.each(["http://example.org/file", "javascript:alert(1)", "data:text/html,unsafe", "//example.org/file", "/images/portrait.svg", "/media/../private.txt", "ftp://example.org/file"])
("rejects unsafe resource URL %s", (url) => {
  expect(resourceSchema.safeParse({ ...resource, links: [{ label: "资源", url }] }).success).toBe(false);
});

it("requires a unique URL-safe slug and recognized resource type", () => {
  expect(resourceSchema.safeParse({ ...resource, slug: "Invalid slug", type: "paper" }).success).toBe(false);
});
