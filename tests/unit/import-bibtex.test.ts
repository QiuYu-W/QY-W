import { execFile as execFileCallback } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { parse } from "yaml";
import { describe, expect, it } from "vitest";

const execFile = promisify(execFileCallback);
const projectRoot = resolve(import.meta.dirname, "../..");
const tsxCli = join(projectRoot, "node_modules", "tsx", "dist", "cli.mjs");
const script = join(projectRoot, "scripts", "import-bibtex.ts");
const fixture = (name: string) => join(projectRoot, "tests", "fixtures", "bibtex", name);

async function runImport(input: string, output: string) {
  return execFile(process.execPath, [tsxCli, script, "--input", input, "--output", output], { cwd: projectRoot });
}

describe("BibTeX import CLI", () => {
  it("updates a complete collection idempotently and leaves it unchanged after a failed import", async () => {
    const directory = await mkdtemp(join(tmpdir(), "research-blog-bibtex-"));
    const output = join(directory, "publications");

    try {
      await expect(runImport(fixture("sample.bib"), output)).resolves.toMatchObject({ stdout: expect.stringMatching(/created:\s*2/i) });
      const first = await readFile(join(output, "fixture-2025-journal.yaml"), "utf8");
      await writeFile(join(output, "fixture-2025-journal.yaml"), `${first}titleZh: 保留字段\n`, "utf8");

      await expect(runImport(fixture("updated.bib"), output)).resolves.toMatchObject({ stdout: expect.stringMatching(/updated:\s*1/i) });
      const records = await Promise.all([
        readFile(join(output, "fixture-2024-conference.yaml"), "utf8"),
        readFile(join(output, "fixture-2025-journal.yaml"), "utf8")
      ]);
      const revised = parse(records[1]);
      expect(revised).toMatchObject({ citationKey: "fixture-2025-journal-revised", title: "Fixture journal record revised", titleZh: "保留字段" });

      const beforeFailure = await Promise.all(records.map(async (_, index) => readFile(join(output, index === 0 ? "fixture-2024-conference.yaml" : "fixture-2025-journal.yaml"), "utf8")));
      await expect(runImport(fixture("invalid.bib"), output)).rejects.toThrow(/fixture-invalid.*year/i);
      await expect(Promise.all([
        readFile(join(output, "fixture-2024-conference.yaml"), "utf8"),
        readFile(join(output, "fixture-2025-journal.yaml"), "utf8")
      ])).resolves.toEqual(beforeFailure);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
