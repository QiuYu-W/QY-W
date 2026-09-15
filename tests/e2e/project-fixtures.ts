import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stringify } from "yaml";

const publishedProject = {
  slug: "robust-feature-selection",
  titleZh: "鲁棒特征选择",
  titleEn: "Robust Feature Selection",
  summaryZh: "用于端到端项目页面验证的隔离测试记录。",
  summaryEn: "An isolated fixture record for end-to-end project-page verification.",
  bodyZh: "## Main content\n\n项目正文的隔离测试内容。 [内部资源](/project-assets/)\n\n<script data-project-raw-html>alert('xss')</script>",
  bodyEn: "## Main content\n\nIsolated project-page test content. [Internal resource](/project-assets/)\n\n<script data-project-raw-html>alert('xss')</script>",
  start: "2025-01-01",
  end: "",
  status: "active",
  roleZh: "测试角色",
  roleEn: "Fixture role",
  cover: "/fixtures/project-cover.svg",
  coverAltZh: "隔离测试项目封面",
  coverAltEn: "Isolated fixture project cover",
  links: [],
  publicationKeys: ["fixture-project-publication"],
  draft: false
};

const draftProject = {
  ...publishedProject,
  slug: "draft-project",
  titleZh: "草稿项目",
  titleEn: "Draft project",
  draft: true
};

export async function writeProjectFixtures(root: string): Promise<void> {
  const directory = join(root, "src/data/projects");
  await mkdir(directory, { recursive: true });
  for (const [filename, record] of [["robust-feature-selection.md", publishedProject], ["draft-project.md", draftProject]] as const) {
    await writeFile(join(directory, filename), `---\n${stringify(record, { defaultStringType: "QUOTE_DOUBLE" })}---\n`);
  }
  const mediaDirectory = join(root, "public/fixtures");
  await mkdir(mediaDirectory, { recursive: true });
  await writeFile(join(mediaDirectory, "project-cover.svg"), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><title>Fixture cover</title><rect width="16" height="9" fill="#1f4e79"/></svg>');
}

export const fixtureProjectPublication = {
  citationKey: "fixture-project-publication",
  title: "Fixture project publication",
  authors: ["Fixture Author"],
  year: 2025,
  venue: "Fixture venue",
  type: "journal",
  status: "published",
  links: [],
  draft: false
};
