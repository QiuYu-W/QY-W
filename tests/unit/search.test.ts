import { expect, it } from "vitest";
import { createServer } from "vite";
import { toSearchDocuments, type SearchablePost } from "../../src/lib/search";

const post: SearchablePost = { id: "zh.md", language: "zh", title: "实验", summary: "摘要", body: "# 正文", slug: "experiment", category: "方法", tags: ["测试"], draft: false };

it("excludes drafts and preserves each published language, metadata and public URL", () => {
  const docs = toSearchDocuments([post, { ...post, id: "en.md", language: "en" }, { ...post, id: "draft.md", draft: true }]);
  expect(docs).toEqual([
    { id: "zh.md", language: "zh", title: "实验", summary: "摘要", category: "方法", tags: ["测试"], url: "/blog/experiment/", text: "正文" },
    { id: "en.md", language: "en", title: "实验", summary: "摘要", category: "方法", tags: ["测试"], url: "/en/blog/experiment/", text: "正文" }
  ]);
});

it("extracts readable Markdown text without frontmatter, markup, URL destinations or executable HTML", () => {
  const body = '---\nsecret: metadata\n---\n# Heading\n\n**Bold** [label](https://example.com)\n\n```js\nconst answer = 42;\n```\n\n<div>Visible &amp; safe</div><script>evil()</script>\n\n![Diagram](/image.png)';
  const text = toSearchDocuments([{ ...post, body }])[0].text;
  expect(text).toBe("Heading Bold label const answer = 42; Visible & safe Diagram");
});

it("builds bilingual search URLs under the configured project base", async () => {
  const server = await createServer({ appType: "custom", base: "/QY-W/", configFile: false, root: process.cwd(), server: { middlewareMode: true } });
  try {
    const search = await server.ssrLoadModule("/src/lib/search.ts") as typeof import("../../src/lib/search");
    expect(search.toSearchDocuments([post, { ...post, language: "en" }]).map((doc) => doc.url)).toEqual(["/QY-W/blog/experiment/", "/QY-W/en/blog/experiment/"]);
  } finally { await server.close(); }
});
