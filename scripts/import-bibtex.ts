import { cp, mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { parse, stringify } from "yaml";
import { matchPublication, mergePublication, parseBibtex, type ImportedPublication } from "../src/lib/bibtex";
import { fileStemForCitationKey, normalizeDoi } from "../src/lib/identifiers";
import { publicationSchema, type PublicationRecord } from "../src/lib/schemas";

type ExistingFile = { path: string; record: PublicationRecord };
type ImportCounts = { created: number; updated: number; unchanged: number; failed: number };
const outputFileSystem = { cp, mkdir, mkdtemp, rename, rm, writeFile };
type ImportOptions = { fs?: Partial<typeof outputFileSystem>; warn?: (message: string) => void };

function argumentsFor(argv: string[]): { input: string; output: string } {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if ((flag !== "--input" && flag !== "--output") || !value || values.has(flag)) {
      throw new Error("Usage: tsx scripts/import-bibtex.ts --input <file.bib> --output <publication-directory>");
    }
    values.set(flag, value);
  }
  const input = values.get("--input");
  const output = values.get("--output");
  if (!input || !output) {
    throw new Error("Usage: tsx scripts/import-bibtex.ts --input <file.bib> --output <publication-directory>");
  }
  return { input: resolve(input), output: resolve(output) };
}

async function yamlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return yamlFiles(path);
    return /\.ya?ml$/i.test(entry.name) ? [path] : [];
  }));
  return nested.flat().sort();
}

async function readExisting(output: string): Promise<ExistingFile[]> {
  try {
    const outputStat = await stat(output);
    if (!outputStat.isDirectory()) throw new Error(`Publication output is not a directory: ${output}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return Promise.all((await yamlFiles(output)).map(async (path) => ({
    path,
    record: publicationSchema.parse(parse(await readFile(path, "utf8")))
  })));
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stable(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function assertDistinctImports(imported: ImportedPublication[]): void {
  const citationKeys = new Set<string>();
  const dois = new Set<string>();
  const stems = new Set<string>();
  for (const record of imported) {
    const key = record.citationKey.trim().toLowerCase();
    if (citationKeys.has(key)) throw new Error(`Duplicate imported citation key: ${record.citationKey}`);
    citationKeys.add(key);
    const stem = fileStemForCitationKey(record.citationKey);
    if (stems.has(stem)) throw new Error(`Duplicate citation-key stem: ${stem}`);
    stems.add(stem);
    const doi = normalizeDoi(record.doi);
    if (doi) {
      if (dois.has(doi)) throw new Error(`Duplicate imported DOI: ${doi}`);
      dois.add(doi);
    }
  }
}

function printCounts(counts: ImportCounts): void {
  console.log(`created: ${counts.created}`);
  console.log(`updated: ${counts.updated}`);
  console.log(`unchanged: ${counts.unchanged}`);
  console.log(`failed: ${counts.failed}`);
}

function ensureSiblings(parent: string, ...paths: string[]): void {
  if (!paths.every((path) => dirname(resolve(path)) === parent)) {
    throw new Error("Atomic import paths must share the publication output parent directory");
  }
}

async function validateTemporaryCollection(directory: string): Promise<void> {
  for (const path of await yamlFiles(directory)) {
    publicationSchema.parse(parse(await readFile(path, "utf8")));
  }
}

async function retryFileOperation(operation: () => Promise<void>): Promise<void> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await operation();
      return;
    } catch (error) {
      if (attempt === 2 || !["EPERM", "EBUSY", "EACCES"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
      await delay(50 * (attempt + 1));
    }
  }
}

async function writeCollectionAtomically(output: string, existingOutput: boolean, changes: Map<string, PublicationRecord>, options: ImportOptions): Promise<void> {
  const { cp, mkdir, mkdtemp, rename, rm, writeFile } = { ...outputFileSystem, ...options.fs };
  const warn = options.warn ?? console.warn;
  const parent = dirname(output);
  await stat(parent);
  const temporary = await mkdtemp(join(parent, `.${basename(output)}.tmp-`));
  const backup = join(parent, `.${basename(output)}.backup-${randomUUID()}`);
  ensureSiblings(parent, output, temporary, backup);
  let preserveRecovery = false;

  try {
    if (existingOutput) await cp(output, temporary, { recursive: true });
    for (const [path, record] of changes) {
      const temporaryPath = join(temporary, relative(output, path));
      await mkdir(dirname(temporaryPath), { recursive: true });
      await writeFile(temporaryPath, stringify(record), "utf8");
    }
    await validateTemporaryCollection(temporary);

    if (!existingOutput) {
      await retryFileOperation(() => rename(temporary, output));
      return;
    }
    await retryFileOperation(() => rename(output, backup));
    try {
      await retryFileOperation(() => rename(temporary, output));
    } catch (error) {
      try {
        await retryFileOperation(() => rename(backup, output));
      } catch (restoreError) {
        // A locked backup may still be readable. Copy the exact original tree
        // back to the requested path and retain the backup for recovery.
        try {
          await retryFileOperation(() => cp(backup, output, { recursive: true }));
          warn(`Restore rename failed (${String(restoreError)}); restored original bytes from backup retained at ${backup}`);
        } catch (copyError) {
          preserveRecovery = true;
          throw new AggregateError([error, restoreError, copyError], `Import swap and recovery failed. Original collection: ${backup}; validated new collection: ${temporary}; output: ${output}`);
        }
      }
      throw error;
    }
    // The second rename commits the import. Cleanup cannot turn that success
    // into a reported import failure after the live collection has changed.
    try {
      await retryFileOperation(() => rm(backup, { recursive: true, force: true }));
    } catch (error) {
      warn(`Import committed; backup cleanup failed at ${backup}: ${String(error)}`);
    }
  } catch (error) {
    if (!preserveRecovery) {
      try {
        await retryFileOperation(() => rm(temporary, { recursive: true, force: true }));
      } catch (cleanupError) {
        warn(`Temporary cleanup failed at ${temporary}: ${String(cleanupError)}`);
      }
    }
    throw error;
  }
}

export async function importBibtex(input: string, output: string, options: ImportOptions = {}): Promise<ImportCounts> {
  const source = await readFile(input, "utf8");
  const imported = parseBibtex(source);
  assertDistinctImports(imported);
  const existing = await readExisting(output);
  const existingRecords = existing.map(({ record }) => record);
  const changes = new Map<string, PublicationRecord>();
  const finalCollection = new Map(existing.map(({ path, record }) => [path, record]));
  const importedTargets = new Set<string>();
  const collisionKey = (path: string) => relative(output, resolve(path)).replaceAll("\\", "/").toLowerCase();
  const occupiedPaths = new Set(existing.map(({ path }) => collisionKey(path)));
  const counts: ImportCounts = { created: 0, updated: 0, unchanged: 0, failed: 0 };

  for (const incoming of imported) {
    const matched = matchPublication(incoming, existingRecords);
    const merged = mergePublication(incoming, matched);
    const target = matched
      ? existing.find(({ record }) => record === matched)?.path
      : join(output, `${fileStemForCitationKey(incoming.citationKey)}.yaml`);
    if (!target) throw new Error(`Unable to locate matched publication ${incoming.citationKey}`);
    if (importedTargets.has(collisionKey(target))) {
      throw new Error(`Multiple imported entries resolve to the same target: ${target}`);
    }
    importedTargets.add(collisionKey(target));
    if (!matched && occupiedPaths.has(collisionKey(target))) {
      throw new Error(`Citation-key filename collision for ${incoming.citationKey}: ${target}`);
    }
    occupiedPaths.add(collisionKey(target));
    finalCollection.set(target, publicationSchema.parse(merged));
    if (matched && stable(matched) === stable(merged)) {
      counts.unchanged += 1;
      continue;
    }
    changes.set(target, merged);
    if (matched) counts.updated += 1;
    else counts.created += 1;
  }

  assertDistinctImports([...finalCollection.values()]);

  const existingOutput = await stat(output).then(() => true).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return false;
    throw error;
  });
  await writeCollectionAtomically(output, existingOutput, changes, options);
  return counts;
}

async function main(): Promise<void> {
  try {
    const { input, output } = argumentsFor(process.argv.slice(2));
    printCounts(await importBibtex(input, output));
  } catch (error) {
    printCounts({ created: 0, updated: 0, unchanged: 0, failed: 1 });
    throw error;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) void main();
