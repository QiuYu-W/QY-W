import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parse } from "yaml";
import { expect, it } from "vitest";

it("commits new and updated publications, skips unchanged imports and leaves unrelated files alone", async () => {
  const workflow = parse(await readFile(new URL("../../.github/workflows/import-publications.yml", import.meta.url), "utf8"));
  const commitStep = workflow.jobs.import.steps.find((step: { name?: string }) => step.name === "Commit imported publications");
  const root = await mkdtemp(join(tmpdir(), "research-blog-import-workflow-"));
  const git = (args: string[], cwd = root) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  // On Windows use the Bash shipped alongside Git; Linux CI uses Bash on PATH.
  const bash = process.platform === "win32"
    ? resolve(dirname(execFileSync("where.exe", ["git"], { encoding: "utf8" }).trim().split(/\r?\n/)[0]), "../bin/bash.exe")
    : "bash";
  const runCommit = () => execFileSync(bash, ["--noprofile", "--norc", "-e", "-o", "pipefail", "-c", commitStep.run], {
    cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]
  });
  try {
    const remote = join(root, "remote.git");
    git(["init", "--bare", remote]);
    git(["init", "-b", "main"]);
    git(["config", "user.name", "Workflow test"]);
    git(["config", "user.email", "workflow-test@example.invalid"]);
    await writeFile(join(root, ".gitignore"), "remote.git/\n");
    await writeFile(join(root, "unrelated.txt"), "original\n");
    await mkdir(join(root, "src/data/publications"), { recursive: true });
    git(["add", ".gitignore", "unrelated.txt"]);
    git(["commit", "-m", "fixture baseline"]);
    git(["remote", "add", "origin", remote]);
    git(["push", "-u", "origin", "main"]);
    await writeFile(join(root, "unrelated.txt"), "unrelated edit\n");
    await writeFile(join(root, "src/data/publications/new.yaml"), "title: New fixture publication\n");

    runCommit();
    expect(git(["show", "main:src/data/publications/new.yaml"], remote)).toBe("title: New fixture publication");
    expect(git(["show", "main:unrelated.txt"], remote)).toBe("original");
    const firstImport = git(["rev-parse", "HEAD"]);
    runCommit();
    expect(git(["rev-parse", "HEAD"])).toBe(firstImport);

    await writeFile(join(root, "src/data/publications/new.yaml"), "title: Updated fixture publication\n");
    runCommit();
    expect(git(["show", "main:src/data/publications/new.yaml"], remote)).toBe("title: Updated fixture publication");
    expect(git(["rev-list", "--count", "HEAD"])).toBe("3");
    expect(git(["diff", "--name-only"])).toBe("unrelated.txt");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 20_000);
