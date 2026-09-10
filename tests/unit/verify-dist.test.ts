import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyDist } from "../../scripts/verify-dist";

const cleanup: string[] = [];
async function fixture(files: Record<string, string>) {
  const root = await mkdtemp(join(tmpdir(), "research-site-dist-"));
  cleanup.push(root);
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), content);
  }
  return root;
}
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(cleanup.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("verifyDist", () => {
  it("reports the referring HTML file for a missing internal route", async () => {
    const root = await fixture({ "index.html": '<a href="/present/">ok</a><a href="/missing/">broken</a>', "present/index.html": "<p>Present</p>" });
    expect(await verifyDist(root)).toEqual({ ok: false, brokenInternal: [{ url: "/missing/", referrer: "index.html" }], missingAssets: [] });
  });

  it.each(["/", "/research-site", "/research-site/"])("resolves routes, relative links, encoded files and query strings at base %s", async (base) => {
    const prefix = base.replace(/\/$/, "");
    const root = await fixture({
      "index.html": `<a href="${prefix}/nested/">nested</a><a href="${prefix}/nested">no slash</a><a href="${prefix}/rss.xml?x=1&amp;y=2#top">RSS</a>`,
      "nested/index.html": `<a href="../?q=1#top">home</a><a href="./child/">child</a><img src="../media/a%20b.svg?v=2"><source srcset="${prefix}/media/a%20b.svg 1x, ../media/large.svg 2x">`,
      "nested/child/index.html": "<p>Child</p>", "rss.xml": "<rss/>", "media/a b.svg": "<svg/>", "media/large.svg": "<svg/>"
    });
    expect(await verifyDist(root, base)).toEqual({ ok: true, brokenInternal: [], missingAssets: [] });
  });

  it("checks each responsive image candidate and sorts/deduplicates failures per referring file", async () => {
    const root = await fixture({
      "index.html": '<a href="/z/">z</a><a href="/a/">a</a><a href="/a/">duplicate</a><img src="/gone.svg"><img src="/gone.svg"><picture><source srcset="/ok.svg 1x, /large.svg 2x"><img src="/ok.svg" srcset="/wide.svg 1200w"></picture>',
      "other/index.html": '<img src="/gone.svg">', "ok.svg": "<svg/>"
    });
    expect(await verifyDist(root)).toEqual({ ok: false,
      brokenInternal: [{ url: "/a/", referrer: "index.html" }, { url: "/z/", referrer: "index.html" }],
      missingAssets: [{ url: "/gone.svg", referrer: "index.html" }, { url: "/large.svg", referrer: "index.html" }, { url: "/wide.svg", referrer: "index.html" }, { url: "/gone.svg", referrer: "other/index.html" }]
    });
  });

  it("rejects project-base omissions, prefix collisions and traversal outside the site", async () => {
    const root = await fixture({ "index.html": '<a href="/present/">no base</a><a href="/site-other/present/">collision</a><a href="../../present/">escape</a><img src="/media.svg">', "present/index.html": "ok", "media.svg": "<svg/>" });
    const result = await verifyDist(root, "/site");
    expect(result.ok).toBe(false);
    expect(result.brokenInternal.map(({ url }) => url)).toEqual(["../../present/", "/present/", "/site-other/present/"]);
    expect(result.missingAssets).toEqual([{ url: "/media.svg", referrer: "index.html" }]);
  });

  it("requires exact filename case and real image files, even on Windows", async () => {
    const root = await fixture({ "index.html": '<a href="/About/">wrong case</a><img src="/media/"><img src="/Photo.svg">', "about/index.html": "ok", "media/index.html": "not an image", "photo.svg": "<svg/>" });
    expect(await verifyDist(root)).toEqual({ ok: false, brokenInternal: [{ url: "/About/", referrer: "index.html" }], missingAssets: [{ url: "/Photo.svg", referrer: "index.html" }, { url: "/media/", referrer: "index.html" }] });
  });

  it("warns about external URLs without fetching them and ignores local fragments, contact and inline data", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetch = vi.spyOn(globalThis, "fetch");
    const root = await fixture({ "index.html": '<a href="#heading">jump</a><a href="mailto:hello@example.org">email</a><a href="tel:123">call</a><a href="https://example.org/offline">remote</a><img src="//example.org/remote.svg"><img src="data:image/svg+xml,%3Csvg/%3E"><source srcset="data:image/png;base64,AAAA 1x, /ok.svg 2x">', "ok.svg": "<svg/>" });
    expect((await verifyDist(root)).ok).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
    expect(warning.mock.calls.flat().join("\n")).toContain("https://example.org/offline");
    expect(warning.mock.calls.flat().join("\n")).toContain("index.html");
  });

  it("does not silently accept an empty build directory", async () => {
    await expect(verifyDist(await fixture({}))).rejects.toThrow(/HTML/);
  });

  it("CLI derives project base from SITE_URL and reports broken links with a nonzero exit", async () => {
    const root = await fixture({ "dist/index.html": '<a href="/site/present/">ok</a>', "dist/present/index.html": "ok" });
    const script = fileURLToPath(new URL("../../scripts/verify-dist.ts", import.meta.url));
    const loader = new URL("../../node_modules/tsx/dist/loader.mjs", import.meta.url).href;
    const run = () => spawnSync(process.execPath, ["--import", loader, script], { cwd: root, encoding: "utf8", env: { ...process.env, SITE_URL: "https://example.org/site" } });
    const passed = run();
    expect(passed.status, passed.stderr).toBe(0);
    await writeFile(join(root, "dist/index.html"), '<a href="/site/missing/">broken</a><img src="/site/missing.svg">');
    const failed = run();
    expect(failed.status).toBe(1);
    expect(failed.stderr).toContain("index.html");
    expect(failed.stderr).toContain("/site/missing/");
    expect(failed.stderr).toContain("/site/missing.svg");
  });
});
