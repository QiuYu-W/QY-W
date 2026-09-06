import { expect, it } from "vitest";
import { renderTrustedMarkdown } from "../../src/lib/markdown";

it("renders Markdown without allowing raw HTML", () => {
  const { html } = renderTrustedMarkdown("<script>alert(1)</script>\n\n## Safe heading");

  expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  expect(html).not.toContain("<script>");
});

it("does not retain unsafe Markdown URL protocols", () => {
  const { html } = renderTrustedMarkdown("[unsafe](javascript:alert(1))");

  expect(html).not.toContain("javascript:");
});

it("prefixes only root-relative Markdown links and images", () => {
  const { html } = renderTrustedMarkdown(
    "[internal](/papers) [external](https://example.org/papers) [mail](mailto:research@example.org) [phone](tel:12345678) [section](#methods)\n\n![Cover](/images/cover.png)",
    "/QY-W/"
  );

  expect(html).toContain('href="/QY-W/papers"');
  expect(html).toContain('src="/QY-W/images/cover.png"');
  expect(html).toContain('href="https://example.org/papers"');
  expect(html).toContain('href="mailto:research@example.org"');
  expect(html).toContain('href="tel:12345678"');
  expect(html).toContain('href="#methods"');
});

it("returns deterministic collision-suffixed h2 and h3 metadata", () => {
  const { html, headings } = renderTrustedMarkdown("## Methods\n\n### Methods\n\n## Methods");

  expect(headings).toEqual([
    { depth: 2, id: "methods", text: "Methods" },
    { depth: 3, id: "methods-2", text: "Methods" },
    { depth: 2, id: "methods-3", text: "Methods" }
  ]);
  expect(html).toContain('<h2 id="methods">Methods</h2>');
  expect(html).toContain('<h3 id="methods-2">Methods</h3>');
});
