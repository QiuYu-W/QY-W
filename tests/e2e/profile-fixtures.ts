import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parse, stringify } from "yaml";

/** Synthetic rich text is confined to the disposable browser-test build. */
export async function writeProfileFixtures(root: string): Promise<void> {
  const path = join(root, "src/data/profile/profile.yaml");
  const profile = parse(await readFile(path, "utf8"));
  const headings = ["Main content", "Profile name", "Interests heading", "Latest posts heading", "About interests", "Education", "Experience", "Honors", "Service", "Skills", "Contact", "Profiles"];
  const safety = '<script data-bio-raw-html>window.bioExecuted = true</script>\n\n<img data-bio-raw-html src=x onerror="window.bioExecuted = true">';
  await writeFile(path, stringify({
    ...profile,
    bioZh: `这是**中文测试**与*强调*。 [测试资源](/fixtures/project-cover.svg)\n\n第二段 & 内容。\n\n- 列表一\n- 列表二\n\n![测试图片](/fixtures/project-cover.svg)\n\n${headings.map((heading) => `## ${heading}`).join("\n\n")}\n\n${safety}`,
    bioEn: `An **English fixture** with *emphasis*. [Test resource](/fixtures/project-cover.svg)\n\nSecond paragraph & content.\n\n- First item\n- Second item\n\n![Test image](/fixtures/project-cover.svg)\n\n${headings.map((heading) => `## ${heading}`).join("\n\n")}\n\n${safety}`
  }));
}
