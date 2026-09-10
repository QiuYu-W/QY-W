import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { load } from "cheerio";

interface Reference { url: string; referrer: string }
export interface VerifyResult {
  ok: boolean;
  brokenInternal: Reference[];
  missingAssets: Reference[];
}

async function filesIn(root: string, directory = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
    const path = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await filesIn(root, path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

// A srcset URL is the non-whitespace token before its optional descriptors.
// Keep commas inside data URLs; trailing commas separate descriptor-free candidates.
function srcsetUrls(value: string): string[] {
  const urls: string[] = [];
  let rest = value;
  while (rest.length) {
    rest = rest.replace(/^[\s,]+/, "");
    if (!rest) break;
    const token = /^\S+/.exec(rest)![0];
    urls.push(token.replace(/,+$/, ""));
    rest = rest.slice(token.length);
    if (!token.endsWith(",")) {
      const comma = rest.indexOf(",");
      rest = comma < 0 ? "" : rest.slice(comma + 1);
    }
  }
  return urls;
}

function uniqueSorted(references: Reference[]): Reference[] {
  const unique = new Map(references.map((reference) => [JSON.stringify(reference), reference]));
  return [...unique.values()].sort((a, b) => a.referrer < b.referrer ? -1 : a.referrer > b.referrer ? 1 : a.url < b.url ? -1 : a.url > b.url ? 1 : 0);
}

/** Inspect the actual exported files without network requests or filesystem writes. */
export async function verifyDist(root: string, basePath = "/"): Promise<VerifyResult> {
  const files = new Set(await filesIn(root));
  const pages = [...files].filter((file) => file.endsWith(".html")).sort();
  if (!pages.length) throw new Error(`No HTML files found in ${root}`);
  const base = `/${basePath.split("/").filter(Boolean).join("/")}`.replace(/\/$/, "");
  const brokenInternal: Reference[] = [];
  const missingAssets: Reference[] = [];
  const external: Reference[] = [];

  for (const referrer of pages) {
    const $ = load(await readFile(join(root, referrer), "utf8"));
    const documentUrl = new URL(`${base}/${referrer.replace(/index\.html$/, "")}`, "https://dist.invalid");
    function check(rawUrl: string, asset: boolean) {
      const url = rawUrl.trim();
      if ((!asset && (!url || url.startsWith("#"))) || /^(mailto:|tel:|data:)/i.test(url)) return;
      if (/^(https?:)?\/\//i.test(url)) {
        external.push({ url, referrer });
        return;
      }
      let present = false;
      try {
        const resolved = new URL(url, documentUrl);
        const pathname = decodeURIComponent(resolved.pathname);
        if (url && resolved.origin === documentUrl.origin && (!base || pathname === base || pathname.startsWith(`${base}/`))) {
          const relative = pathname.slice(base.length).replace(/^\//, "");
          // Set membership is intentionally case sensitive on every operating system.
          present = files.has(relative) || (!asset && files.has(`${relative.replace(/\/$/, "")}${relative ? "/" : ""}index.html`));
        }
      } catch { /* malformed URLs and escaping paths are reported below */ }
      if (!present) (asset ? missingAssets : brokenInternal).push({ url, referrer });
    }
    $("a[href]").each((_, element) => check($(element).attr("href")!, false));
    $("img[src]").each((_, element) => check($(element).attr("src")!, true));
    $("source[srcset], img[srcset]").each((_, element) => {
      for (const url of srcsetUrls($(element).attr("srcset")!)) check(url, true);
    });
  }
  for (const { url, referrer } of uniqueSorted(external)) console.warn(`External URL (not fetched): ${referrer} -> ${url}`);
  return { ok: !brokenInternal.length && !missingAssets.length, brokenInternal: uniqueSorted(brokenInternal), missingAssets: uniqueSorted(missingAssets) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const basePath = new URL(process.env.SITE_URL || "http://localhost:4321").pathname;
    const result = await verifyDist("dist", basePath);
    for (const { url, referrer } of result.brokenInternal) console.error(`Broken internal link: ${referrer} -> ${url}`);
    for (const { url, referrer } of result.missingAssets) console.error(`Missing image: ${referrer} -> ${url}`);
    if (result.ok) console.log("Generated site verified: no broken internal links or missing images.");
    else process.exitCode = 1;
  } catch (error) {
    console.error(`Generated-site verification failed: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  }
}
