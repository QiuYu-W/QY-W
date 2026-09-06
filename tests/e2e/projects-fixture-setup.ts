import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "astro";
import { stringify } from "yaml";
import startPreview from "./global-setup";
import { fixtureProjectPublication, writeProjectFixtures } from "./project-fixtures";

/** Build project routes from disposable content without adding fictional owner content. */
export default async function setupProjectsFixture() {
  const projectRoot = process.cwd();
  const scratchParent = join(projectRoot, ".tmp");
  await mkdir(scratchParent, { recursive: true });
  const fixtureRoot = await mkdtemp(join(scratchParent, "projects-e2e-"));
  let stop: (() => Promise<void>) | undefined;
  try {
    await cp(join(projectRoot, "src"), join(fixtureRoot, "src"), { recursive: true });
    await cp(join(projectRoot, "public"), join(fixtureRoot, "public"), { recursive: true });
    for (const file of ["astro.config.mjs", "package.json", "tsconfig.json"]) await cp(join(projectRoot, file), join(fixtureRoot, file));
    await writeProjectFixtures(fixtureRoot);
    const publicationDirectory = join(fixtureRoot, "src/data/publications");
    await writeFile(join(publicationDirectory, "fixture-project-publication.yaml"), stringify(fixtureProjectPublication));
    process.chdir(fixtureRoot);
    await build({ root: fixtureRoot });
    // Preserve the strict-port/readiness/stop preview lifecycle from global setup.
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
