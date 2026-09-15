import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseDocument } from "yaml";
import { expect, it } from "vitest";

async function workflow(name: string) {
  const document = parseDocument(await readFile(new URL(`../../.github/workflows/${name}.yml`, import.meta.url), "utf8"));
  expect(document.errors).toEqual([]);
  return document.toJS();
}

it("rejects invalid production SITE_URL values before building and accepts root/project https URLs", async () => {
  const deploy = await workflow("deploy");
  const step = deploy.jobs.build.steps.find((entry: { name?: string }) => entry.name === "Validate production site URL");
  const bash = process.platform === "win32"
    ? resolve(dirname(execFileSync("where.exe", ["git"], { encoding: "utf8" }).trim().split(/\r?\n/)[0]), "../bin/bash.exe")
    : "bash";
  for (const value of ["", "http://example.org", "https://", "https:example.org", "https:/example.org", "https://example.org/", "https://example.org/site/", "https://example.org/site?x=1", "https://example.org?", "https://example.org#", "https://example.org/#hash", "https://user:pass@example.org", " https://example.org"]) {
    const result = spawnSync(bash, ["--noprofile", "--norc", "-e", "-o", "pipefail", "-c", step.run], { encoding: "utf8", env: { ...process.env, SITE_URL: value } });
    expect(result.status, `${value}: ${result.stderr}`).toBe(1);
    expect(result.stderr).toContain("SITE_URL");
  }
  for (const value of ["https://example.org", "https://example.org/research-site"]) {
    const result = spawnSync(bash, ["--noprofile", "--norc", "-e", "-o", "pipefail", "-c", step.run], { encoding: "utf8", env: { ...process.env, SITE_URL: value } });
    expect(result.status, result.stderr).toBe(0);
  }
}, 20_000);

it("gates production builds to main and successful same-repository publication imports", async () => {
  const deploy = await workflow("deploy");
  const importWorkflow = await workflow("import-publications");
  expect(deploy.on.workflow_run.workflows).toContain(importWorkflow.name);
  expect(deploy.on.workflow_run.types).toEqual(["completed"]);
  // The workflow expression uses only the boolean/property subset shared with JavaScript.
  const allowed = new Function("github", `return (${deploy.jobs.build.if});`);
  for (const [event_name, ref, branch, conclusion, repository, expected] of [
    ["push", "refs/heads/main", "main", "success", "owner/site", true],
    ["workflow_dispatch", "refs/heads/main", "main", "success", "owner/site", true],
    ["workflow_dispatch", "refs/heads/feature", "feature", "success", "owner/site", false],
    ["workflow_run", "refs/heads/main", "main", "success", "owner/site", true],
    ["workflow_run", "refs/heads/main", "main", "failure", "owner/site", false],
    ["workflow_run", "refs/heads/main", "feature", "success", "owner/site", false],
    ["workflow_run", "refs/heads/main", "main", "success", "fork/site", false]
  ]) {
    expect(allowed({ event_name, ref, repository: "owner/site", event: { workflow_run: { conclusion, head_branch: branch, head_repository: { full_name: repository } } } })).toBe(expected);
  }
  expect(deploy.jobs.build.steps[0].with.ref).toBe("main");
});

it("keeps build jobs read-only and uploads only after production checks and browser tests", async () => {
  const deploy = await workflow("deploy");
  const ci = await workflow("ci");
  expect(ci.permissions).toEqual({ contents: "read" });
  expect(deploy.permissions).toEqual({ contents: "read" });
  expect(deploy.jobs.deploy.permissions).toEqual({ pages: "write", "id-token": "write" });
  expect(deploy.jobs.deploy.needs).toBe("build");
  expect(deploy.concurrency).toEqual({ group: "pages", "cancel-in-progress": false });
  for (const job of [ci.jobs.verify, deploy.jobs.build]) {
    expect(job.env.SITE_URL).toBe("${{ vars.SITE_URL }}");
    const runs = job.steps.filter((step: { run?: string }) => step.run).map((step: { run: string }) => step.run);
    expect(runs).toContain("pnpm install --frozen-lockfile");
    expect(runs.indexOf("pnpm verify")).toBeGreaterThan(runs.indexOf("pnpm install --frozen-lockfile"));
    expect(runs.indexOf("pnpm test:e2e")).toBeGreaterThan(runs.indexOf("pnpm verify"));
    expect(job.steps.every((step: { [key: string]: unknown }) => !step["continue-on-error"])).toBe(true);
  }
  const steps = deploy.jobs.build.steps;
  const upload = steps.findIndex((step: { uses?: string }) => step.uses?.startsWith("actions/upload-pages-artifact@"));
  expect(upload).toBeGreaterThan(steps.findIndex((step: { run?: string }) => step.run === "pnpm test:e2e"));
  expect(steps[upload].with.path).toBe("dist");
  expect(steps[upload].if).toBeUndefined();
});
