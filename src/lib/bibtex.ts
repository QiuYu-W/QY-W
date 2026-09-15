import { Cite } from "@citation-js/core";
import "@citation-js/plugin-bibtex";
import { normalizeDoi } from "./identifiers";
import { importedPublicationSchema, type PublicationRecord } from "./schemas";

type CslRecord = Record<string, unknown>;

export type ImportedPublication = Pick<
  PublicationRecord,
  "citationKey" | "doi" | "title" | "authors" | "year" | "venue" | "type" | "volume" | "issue" | "pages"
> & { status?: PublicationRecord["status"] };

const publicationTypes: Record<string, PublicationRecord["type"]> = {
  "article-journal": "journal",
  "paper-conference": "conference",
  article: "preprint",
  book: "book",
  chapter: "chapter",
  thesis: "thesis"
};

function text(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const first = value.find((item): item is string => typeof item === "string" && item.trim().length > 0);
    return first?.trim();
  }
  return undefined;
}

function citationKey(record: CslRecord): string {
  return text(record["citation-key"]) ?? text(record.id) ?? "unknown citation key";
}

function required(record: CslRecord, key: string, value: string | number | undefined): string | number {
  if (value === undefined || value === "") {
    throw new Error(`BibTeX record "${citationKey(record)}" is missing required ${key}`);
  }
  return value;
}

function formatAuthor(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const author = value as Record<string, unknown>;
  const literal = text(author.literal);
  if (literal) return literal;
  const given = text(author.given);
  const family = text(author.family);
  const formatted = [given, family].filter((part): part is string => Boolean(part)).join(" ");
  return formatted || undefined;
}

function importedPublication(record: CslRecord): ImportedPublication {
  const key = citationKey(record);
  const title = required(record, "title", text(record.title)) as string;
  const dateParts = record.issued && typeof record.issued === "object"
    ? (record.issued as Record<string, unknown>)["date-parts"]
    : undefined;
  const yearValue = Array.isArray(dateParts) && Array.isArray(dateParts[0]) ? dateParts[0][0] : undefined;
  const year = typeof yearValue === "number" ? yearValue : typeof yearValue === "string" ? Number(yearValue) : undefined;
  if (typeof year !== "number" || !Number.isInteger(year)) {
    throw new Error(`BibTeX record "${key}" is missing required year`);
  }
  const authors = Array.isArray(record.author)
    ? record.author.map(formatAuthor).filter((author): author is string => Boolean(author))
    : [];
  if (authors.length === 0) {
    throw new Error(`BibTeX record "${key}" is missing required author`);
  }
  const venue = required(record, "venue", text(record["container-title"]) ?? text(record.publisher)) as string;
  const type = publicationTypes[text(record.type) ?? ""] ?? "other";
  const doi = normalizeDoi(text(record.DOI));

  return {
    citationKey: key,
    ...(doi ? { doi } : {}),
    title,
    authors,
    year,
    venue,
    type,
    status: type === "preprint" ? "preprint" : "published",
    ...(text(record.volume) ? { volume: text(record.volume) } : {}),
    ...(text(record.issue) ? { issue: text(record.issue) } : {}),
    ...(text(record.page) ? { pages: text(record.page) } : {})
  };
}

/** Parse a complete BibTeX source into deterministic, schema-compatible publication records. */
export function parseBibtex(source: string): ImportedPublication[] {
  let records: CslRecord[];
  try {
    records = new Cite(source).data as CslRecord[];
  } catch (error) {
    throw new Error(`Unable to parse BibTeX: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (records.length === 0) {
    throw new Error("BibTeX source contains no publication records");
  }
  return records.map((record) => {
    const result = importedPublicationSchema.safeParse(importedPublication(record));
    if (!result.success) {
      throw new Error(`BibTeX record "${citationKey(record)}": ${result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
    }
    return result.data;
  }).sort((left, right) => left.citationKey.localeCompare(right.citationKey));
}

/** Find the one CMS record updated by an import: DOI wins, then a key-only import uses the citation key. */
export function matchPublication(
  imported: ImportedPublication,
  existing: PublicationRecord[]
): PublicationRecord | undefined {
  const importedDoi = normalizeDoi(imported.doi);
  if (importedDoi) {
    return existing.find((record) => normalizeDoi(record.doi) === importedDoi);
  }
  const key = imported.citationKey.trim().toLowerCase();
  return existing.find((record) => record.citationKey.trim().toLowerCase() === key);
}

/** Apply BibTeX-owned bibliography fields while retaining CMS-owned presentation fields. */
export function mergePublication(imported: ImportedPublication, existing?: PublicationRecord): PublicationRecord {
  return {
    citationKey: imported.citationKey,
    ...(normalizeDoi(imported.doi) ? { doi: normalizeDoi(imported.doi) } : {}),
    title: imported.title,
    ...(existing?.titleZh !== undefined ? { titleZh: existing.titleZh } : {}),
    authors: imported.authors,
    year: imported.year,
    venue: imported.venue,
    type: imported.type,
    status: existing?.status ?? imported.status ?? (imported.type === "preprint" ? "preprint" : "published"),
    ...(imported.volume ? { volume: imported.volume } : {}),
    ...(imported.issue ? { issue: imported.issue } : {}),
    ...(imported.pages ? { pages: imported.pages } : {}),
    ...(existing?.abstractZh !== undefined ? { abstractZh: existing.abstractZh } : {}),
    ...(existing?.abstractEn !== undefined ? { abstractEn: existing.abstractEn } : {}),
    links: existing?.links ?? [],
    draft: existing?.draft ?? false
  };
}
