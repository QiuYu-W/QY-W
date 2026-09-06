import * as fs from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { stringify } from "yaml";
import { importBibtex } from "../../scripts/import-bibtex";

const original = stringify({ citationKey: "existing", doi: "10.1000/existing", title: "Before", authors: ["A"], year: 2025, venue: "V", type: "journal", status: "published", links: [], draft: false });

it.each(["year={0}", "year={10000}", "year={2026}, doi={invalid}"])("rejects %s before creating any temporary directory", async (fields) => {
  const directory = await fs.mkdtemp(join(tmpdir(), "research-blog-before-write-"));
  try {
    const input = join(directory, "input.bib");
    await fs.writeFile(input, `@article{invalid-bibliography, title={Title}, author={A}, journal={V}, ${fields}}`);
    await expect(importBibtex(input, join(directory, "publications"), {
      fs: { mkdtemp: async () => { throw new Error("temporary write attempted"); } }
    })).rejects.toThrow(/invalid-bibliography[\s\S]*(year|doi)/i);
    expect(await fs.readdir(directory)).toEqual(["input.bib"]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

async function collection(directory: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  for (const name of (await fs.readdir(directory)).sort()) {
    const path = join(directory, name);
    if ((await fs.stat(path)).isDirectory()) {
      for (const [child, bytes] of Object.entries(await collection(path))) files[`${name}/${child}`] = bytes;
    } else files[name] = (await fs.readFile(path)).toString("hex");
  }
  return files;
}

it.each(["first rename", "second rename", "restore rename", "backup cleanup", "temporary cleanup", "transient rename"])("preserves truthful results after %s failure", async (failure) => {
  const directory = await fs.mkdtemp(join(tmpdir(), "research-blog-atomic-"));
  const output = join(directory, "publications");
  try {
    await fs.mkdir(join(output, "nested"), { recursive: true });
    await fs.writeFile(join(output, "existing.yaml"), original);
    await fs.writeFile(join(output, "nested", "keep.bin"), Buffer.from([0, 255, 13, 10]));
    const before = await collection(output);
    const input = join(directory, "input.bib");
    await fs.writeFile(input, "@article{existing, doi={10.1000/existing}, title={After}, author={A}, year={2026}, journal={V}}");
    const warnings: string[] = [];
    let transientFailed = false;
    const denied = (operation: string) => Object.assign(new Error(`injected ${operation}`), { code: "EBUSY" });
    const adapter: { rename: typeof fs.rename; rm: typeof fs.rm } = {
      rename: async (source, target) => {
        if ((failure === "first rename" && source === output)
          || (["second rename", "restore rename", "temporary cleanup"].includes(failure) && String(source).includes(".tmp-"))
          || (failure === "restore rename" && String(source).includes(".backup-"))) throw denied(String(source).includes(".backup-") ? "restore rename" : failure);
        if (failure === "transient rename" && !transientFailed) {
          transientFailed = true;
          throw denied("transient rename");
        }
        return fs.rename(source, target);
      },
      rm: async (path, options) => {
        if ((failure === "backup cleanup" && String(path).includes(".backup-"))
          || (failure === "temporary cleanup" && String(path).includes(".tmp-"))) throw denied(failure);
        return fs.rm(path, options);
      }
    };
    const result = importBibtex(input, output, { fs: adapter, warn: (warning: string) => warnings.push(warning) });
    if (["backup cleanup", "transient rename"].includes(failure)) {
      await expect(result).resolves.toEqual({ created: 0, updated: 1, unchanged: 0, failed: 0 });
      expect(await fs.readFile(join(output, "existing.yaml"), "utf8")).toContain("title: After");
      if (failure === "backup cleanup") {
        expect(warnings.join("\n")).toMatch(/committed.*backup.*cleanup/i);
        const backup = (await fs.readdir(directory)).find((name) => name.includes(".backup-"));
        expect(backup).toBeDefined();
        expect(await collection(join(directory, backup!))).toEqual(before);
        expect(warnings.join("\n")).toContain(join(directory, backup!));
      }
    } else {
      await expect(result).rejects.toThrow(/injected/);
      expect(await collection(output)).toEqual(before);
      if (failure === "restore rename") expect(warnings.join("\n")).toMatch(/restore.*backup/i);
      if (failure === "temporary cleanup") expect(warnings.join("\n")).toMatch(/temporary.*cleanup/i);
    }
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
