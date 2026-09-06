import { expect, it } from "vitest";
import { publicationSchema } from "../../src/lib/schemas";

const record = { citationKey: "fixture", title: "Fixture", authors: ["A"], year: 2026, venue: "V", type: "journal", status: "published" };

it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "//example.org/resource", "mailto:example@example.org", "ftp://example.org/resource"])("rejects unsafe or non-web publication resource URL %s", (url) => {
  expect(publicationSchema.safeParse({ ...record, links: [{ label: "Resource", url }] }).success).toBe(false);
});

it.each(["https://example.org/resource", "http://example.org/resource"])("accepts explicit web resource URL %s", (url) => {
  expect(publicationSchema.parse({ ...record, links: [{ label: "Resource", url }] }).links).toEqual([{ label: "Resource", url }]);
});
