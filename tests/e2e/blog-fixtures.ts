import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stringify } from "yaml";

/** Deliberately fictional test documents, written only in the disposable E2E root. */
export async function writeBlogFixtures(root: string): Promise<void> {
  const directory = join(root, "src/data/blog");
  await mkdir(directory, { recursive: true });
  for (const language of ["zh", "en"] as const) {
    for (const [slug, category, tags, draft] of [
      ["fixture-alpha", "Methods", ["alpha"], false],
      ["fixture-beta", "Notes", ["beta"], false],
      ["fixture-related", "Methods", ["alpha"], false],
      ["fixture-secret", "Methods", ["alpha"], true],
      ["fixture-single", "Notes", ["single"], language !== "zh"],
      ["fixture-single-en", "Notes", ["single"], language !== "en"]
    ] as const) {
      const record = { language, slug, title: `${language} ${slug}`, summary: `Isolated ${language} blog fixture`, publishedAt: slug === "fixture-alpha" ? "2025-02-03" : "2025-01-01", updatedAt: "2025-03-01", category, tags, draft, cover: "/fixtures/project-cover.svg", coverAlt: slug === "fixture-alpha" ? `${language} fixture cover` : "" };
      const body = `## Main content\n\n${slug === "fixture-alpha" ? "独有术语 quantumbanana" : "Other test text"}\n\n### Methods\n\n[Fixture resource](/fixtures/project-cover.svg)\n\n![Body image](/fixtures/project-cover.svg)\n\n[Unsafe](javascript:alert(1))\n\n<script data-blog-raw-html>alert('xss')</script>\n\n\`\`\`js\nconst fixture = true;\n\`\`\`\n`;
      await writeFile(join(directory, `${language}-${slug}.md`), `---\n${stringify(record)}---\n${body}`);
    }
  }
}
