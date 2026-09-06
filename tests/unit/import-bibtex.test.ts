import { execFile as execFileCallback } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { parse, stringify } from "yaml";
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
  it("can be imported as an API without running the CLI", async () => {
    const result = await execFile(process.execPath, [tsxCli, "-e", "import('./scripts/import-bibtex.ts')"], { cwd: projectRoot });
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("");
  });
  it.each([
    { name: "DOI match introducing a case-folded duplicate key", keys: ["target", "INCOMING"], dois: ["10.1000/target", "10.1000/other"], input: "@article{incoming, doi={10.1000/target}, title={New}, author={A}, year={2026}, journal={V}}", error: /duplicate.*citation key/i },
    { name: "DOI and key-only imports targeting one file", keys: ["existing"], dois: ["10.1000/target"], input: "@article{a-first, doi={10.1000/target}, title={First}, author={A}, year={2026}, journal={V}}\n@article{existing, title={Second}, author={A}, year={2026}, journal={V}}", error: /same.*target/i },
    { name: "duplicate normalized DOI in final collection", keys: ["one", "two"], dois: ["10.1000/SAME", "https://doi.org/10.1000/same"], input: "@article{new, title={New}, author={A}, year={2026}, journal={V}}", error: /duplicate.*DOI/i },
    { name: "duplicate citation-key stems across differently named files", keys: ["a:b", "a-b"], dois: ["10.1000/one", "10.1000/two"], input: "@article{new, title={New}, author={A}, year={2026}, journal={V}}", error: /duplicate.*stem/i }
  ])("rejects $name before changing the collection", async ({ keys, dois, input: source, error }) => {
    const directory = await mkdtemp(join(tmpdir(), "research-blog-identity-"));
    const output = join(directory, "publications");
    try {
      await mkdir(output);
      const originals = keys.map((citationKey, index) => stringify({ citationKey, doi: dois[index], title: "Old", authors: ["A"], year: 2025, venue: "V", type: "journal", status: "published", links: [], draft: false }));
      await Promise.all(originals.map((record, index) => writeFile(join(output, `${index}.yaml`), record)));
      const input = join(directory, "input.bib");
      await writeFile(input, source);
      await expect(runImport(input, output)).rejects.toMatchObject({ code: 1, stdout: "created: 0\nupdated: 0\nunchanged: 0\nfailed: 1\n", stderr: expect.stringMatching(error) });
      expect(await readdir(output)).toEqual(keys.map((_, index) => `${index}.yaml`));
      expect(await Promise.all(keys.map((_, index) => readFile(join(output, `${index}.yaml`), "utf8")))).toEqual(originals);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("rejects a case-insensitive filename collision without altering filenames or bytes", async () => {
    const directory = await mkdtemp(join(tmpdir(), "research-blog-collision-"));
    const output = join(directory, "publications");
    try {
      await mkdir(output);
      const original = stringify({ citationKey: "unrelated", title: "Existing", authors: ["A"], year: 2025, venue: "V", type: "journal", status: "published", links: [], draft: false });
      await writeFile(join(output, "Foo.yaml"), original);
      const input = join(directory, "input.bib");
      await writeFile(input, "@article{foo, title={Incoming}, author={Doe, Jane}, year={2026}, journal={V}}");
      await expect(runImport(input, output)).rejects.toMatchObject({ code: 1, stdout: "created: 0\nupdated: 0\nunchanged: 0\nfailed: 1\n", stderr: expect.stringMatching(/filename collision/i) });
      expect(await readdir(output)).toEqual(["Foo.yaml"]);
      expect(await readFile(join(output, "Foo.yaml"), "utf8")).toBe(original);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
  it("updates a complete collection idempotently and leaves it unchanged after a failed import", async () => {
    const directory = await mkdtemp(join(tmpdir(), "research-blog-bibtex-"));
    const output = join(directory, "publications");

    try {
      await expect(runImport(fixture("sample.bib"), output)).resolves.toMatchObject({ stdout: expect.stringMatching(/created:\s*2/i) });
      const first = await readFile(join(output, "fixture-2025-journal.yaml"), "utf8");
      await writeFile(join(output, "fixture-2025-journal.yaml"), `${first}titleZh: ""\nabstractZh: ""\nabstractEn: ""\n`, "utf8");

      await expect(runImport(fixture("updated.bib"), output)).resolves.toMatchObject({ stdout: expect.stringMatching(/updated:\s*1/i) });
      const records = await Promise.all([
        readFile(join(output, "fixture-2024-conference.yaml"), "utf8"),
        readFile(join(output, "fixture-2025-journal.yaml"), "utf8")
      ]);
      const revised = parse(records[1]);
      expect(revised).toMatchObject({ citationKey: "fixture-2025-journal-revised", title: "Fixture journal record revised", titleZh: "", abstractZh: "", abstractEn: "" });
      await expect(runImport(fixture("updated.bib"), output)).resolves.toMatchObject({ stdout: "created: 0\nupdated: 0\nunchanged: 1\nfailed: 0\n" });
      expect(await readFile(join(output, "fixture-2025-journal.yaml"), "utf8")).toBe(records[1]);

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
