import { load } from "cheerio";
import { micromark } from "micromark";

export interface MarkdownHeading {
  depth: number;
  id: string;
  text: string;
}

function normalizedBasePath(basePath: string): string {
  const trimmed = basePath.trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "";
}

function isSafeUrl(value: string): boolean {
  const protocol = value.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  return !protocol || ["http", "https", "mailto", "tel"].includes(protocol);
}

function prefixRootRelativeUrl(value: string, basePath: string): string {
  if (!isSafeUrl(value)) return "";
  if (!value.startsWith("/") || value.startsWith("//")) return value;
  return `${basePath}${value}`;
}

function prefixSrcset(value: string, basePath: string): string {
  return value.split(",").map((candidate) => {
    const match = candidate.match(/^(\s*)(\/(?!\/)[^\s,]*)(.*)$/);
    return match ? `${match[1]}${prefixRootRelativeUrl(match[2], basePath)}${match[3]}` : candidate;
  }).join(",");
}

function headingId(text: string): string {
  return text.normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/\p{Mark}/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

/** Render repository-authored Markdown without permitting executable raw HTML. */
export function renderTrustedMarkdown(source: string, basePath = import.meta.env.BASE_URL): { html: string; headings: MarkdownHeading[] } {
  const $ = load(micromark(source, { allowDangerousHtml: false, allowDangerousProtocol: true }), null, false);
  const normalizedBase = normalizedBasePath(basePath);

  $("a[href]").each((_, element) => {
    const value = $(element).attr("href");
    if (value) $(element).attr("href", prefixRootRelativeUrl(value, normalizedBase));
  });
  $("img[src]").each((_, element) => {
    const value = $(element).attr("src");
    if (value) $(element).attr("src", prefixRootRelativeUrl(value, normalizedBase));
  });
  $("source[srcset]").each((_, element) => {
    const value = $(element).attr("srcset");
    if (value) $(element).attr("srcset", prefixSrcset(value, normalizedBase));
  });

  const usedIds = new Map<string, number>();
  const headings: MarkdownHeading[] = [];
  $("h2, h3").each((_, element) => {
    const text = $(element).text().replace(/\s+/g, " ").trim();
    const baseId = headingId(text);
    const occurrence = (usedIds.get(baseId) ?? 0) + 1;
    usedIds.set(baseId, occurrence);
    const id = occurrence === 1 ? baseId : `${baseId}-${occurrence}`;
    const depth = element.tagName === "h2" ? 2 : 3;
    $(element).attr("id", id);
    headings.push({ depth, id, text });
  });

  return { html: $.html(), headings };
}
