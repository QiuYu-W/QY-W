import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { build } from "astro";
import { parse, stringify } from "yaml";
import startPreview from "./global-setup";

/** Build real routes with synthetic records only inside a disposable test root. */
export default async function setupPublicationsFixture() {
  const projectRoot = process.cwd();
  const scratchParent = join(projectRoot, ".tmp");
  await mkdir(scratchParent, { recursive: true });
  const fixtureRoot = await mkdtemp(join(scratchParent, "publications-e2e-"));
  let stop: (() => Promise<void>) | undefined;
  try {
    const publicationsSource = resolve(projectRoot, "src/data/publications");
    await cp(join(projectRoot, "src"), join(fixtureRoot, "src"), {
      recursive: true,
      filter: (path) => resolve(path) !== publicationsSource
    });
    await cp(join(projectRoot, "public"), join(fixtureRoot, "public"), { recursive: true });
    for (const file of ["astro.config.mjs", "package.json", "tsconfig.json"]) await cp(join(projectRoot, file), join(fixtureRoot, file));
    const profilePath = join(fixtureRoot, "src/data/profile/profile.yaml");
    const profile = parse(await readFile(profilePath, "utf8"));
    await writeFile(profilePath, stringify({ ...profile, nameZh: "测试作者", nameEn: "Fixture Owner", authorAliases: ["F. Owner"] }));
    const publicationDirectory = join(fixtureRoot, "src/data/publications");
    await mkdir(publicationDirectory);
    const records = [
      { citationKey: "fixture-new-journal", title: "Fixture new journal", titleZh: "测试中文译名", year: 2026, type: "journal", authors: ["  fixture owner  ", "Other Author", "Fixture Owner Jr."] },
      { citationKey: "fixture-new-conference", title: "Fixture new conference", year: 2026, type: "conference", authors: [" F. OWNER ", "测试作者"] },
      { citationKey: "fixture-old-journal", title: "Fixture old journal", year: 2024, type: "journal", authors: ["Other Author"] }
    ];
    for (const record of records) await writeFile(join(publicationDirectory, `${record.citationKey}.yaml`), stringify({ ...record, venue: "Fixture venue", status: "published", links: [{ label: "Fixture resource", url: "https://example.org/resource" }], draft: false }));
    process.chdir(fixtureRoot);
    await build({ root: fixtureRoot });
    // Reuse the approved strict-port/readiness/stop lifecycle unchanged.
    stop = await startPreview();
    process.chdir(projectRoot);
    return async () => {
      try { await stop?.(); } finally { await rm(fixtureRoot, { recursive: true, force: true }); }
    };
  } catch (error) {
    process.chdir(projectRoot);
    try { await stop?.(); } finally { await rm(fixtureRoot, { recursive: true, force: true }); }
    throw error;
  }
}
