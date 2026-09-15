import { expect, it } from "vitest";
import { projectSchema } from "../../src/lib/schemas";

const record = {
  slug: "fixture-project",
  titleZh: "测试项目",
  titleEn: "Fixture project",
  summaryZh: "测试摘要",
  summaryEn: "Fixture summary",
  bodyZh: "测试正文",
  bodyEn: "Fixture body",
  start: "2026-01-01",
  end: "",
  status: "active" as const,
  roleZh: "测试角色",
  roleEn: "Fixture role"
};

it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "mailto:research@example.org", "tel:12345678", "//example.org/resource", "ftp://example.org/resource"])("rejects unsafe or non-web project resource URL %s", (url) => {
  expect(projectSchema.safeParse({ ...record, links: [{ label: "Resource", url }] }).success).toBe(false);
});

it.each(["https://example.org/resource", "http://example.org/resource"])("accepts explicit web project resource URL %s", (url) => {
  expect(projectSchema.parse({ ...record, links: [{ label: "Resource", url }] }).links).toEqual([{ label: "Resource", url }]);
});
