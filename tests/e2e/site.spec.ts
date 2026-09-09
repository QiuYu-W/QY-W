import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const basePath = new URL(process.env.SITE_URL || "http://localhost:4321").pathname.replace(/\/$/, "");
const atConfiguredBase = (path: string) => `${basePath}${path}`;
const escapeForRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const routes = ["/", "/en/", "/about/", "/en/about/"];
const localizedPages = [
  {
    route: "/",
    locale: "zh",
    labels: ["论文成果", "科研项目", "博客文章"],
    hrefs: ["/publications/", "/projects/", "/blog/"],
    emptyPostsMessage: "暂时没有已发布的博客文章。"
  },
  {
    route: "/en/",
    locale: "en",
    labels: ["Publications", "Projects", "Blog posts"],
    hrefs: ["/en/publications/", "/en/projects/", "/en/blog/"],
    emptyPostsMessage: "No blog posts have been published yet."
  }
] as const;

async function expectNoRejectedControls(page: import("@playwright/test").Page, locale: "zh" | "en") {
  const main = page.locator("main");
  const rejectedLinkNames = locale === "zh"
    ? /^(?:查看(?:论文|成果|项目|博客|详情)|查看更多|查看全部|了解更多|进入(?:论文|项目|博客)|(?:下载)?(?:简历|履历)(?:\s*PDF)?|联系我)$/i
    : /^(?:view\s+(?:publications|projects|blog(?:\s+posts)?|details)|see\s+all|read\s+more|learn\s+more|explore|download\s+(?:cv|résumé|resume)|(?:cv|résumé|resume)(?:\s+pdf)?|contact\s+me)$/i;

  await expect(main.locator("button, [role=button], a[download], a[href*='.pdf' i]")).toHaveCount(0);
  await expect(main.getByRole("link", { name: rejectedLinkNames })).toHaveCount(0);
  await expect(main.getByRole("link", { name: /简历|履历|\b(?:cv|curriculum vitae|résumé|resume)\b/i })).toHaveCount(0);
  await expect(main.locator("[data-testid=cta-cluster], [data-testid=featured-results], [data-testid=homepage-right-column], [data-testid=research-directions], [data-testid=cv-download]")).toHaveCount(0);
  await expect(page.locator("main aside")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /精选成果|Featured (?:results|work)|研究方向|Research directions/i })).toHaveCount(0);

  // Ordinary anchors need no button role, download attribute, or known CTA label.
  // Only the approved count/post links and About contact/profile links belong here.
  expect(await main.locator("a").evaluateAll((links) => links.filter((link) => !link.closest(
    '[data-testid="content-counts"], [data-testid="homepage-post"] h3, [data-testid="about-content"] section[aria-labelledby="contact"], [data-testid="about-content"] section[aria-labelledby="profiles"]'
  )).map((link) => ({ name: link.textContent, href: link.getAttribute("href") })))).toEqual([]);
}

for (const route of routes) {
  test(`${route} renders without serious accessibility violations`, async ({ page }) => {
    await page.goto(atConfiguredBase(route));
    await expect(page.locator("main")).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
  });
}

for (const { route, locale, labels, hrefs } of localizedPages) {
  test(`${locale} homepage exposes one localized count row with three linked numeric totals`, async ({ page }) => {
    await page.goto(atConfiguredBase(route));
    const countRows = page.getByTestId("content-counts");
    await expect(countRows).toHaveCount(1);

    const links = countRows.getByRole("link");
    await expect(links).toHaveCount(3);
    for (const [index, label] of labels.entries()) {
      await expect(links.nth(index)).toHaveAccessibleName(new RegExp(`^\\d+ ${label}$`));
      await expect(links.nth(index)).toHaveAttribute("href", atConfiguredBase(hrefs[index]));
    }
  });

  test(`${locale} homepage limits posts to two and keeps any rendered post in its locale`, async ({ page }) => {
    await page.goto(atConfiguredBase(route));
    const posts = page.getByTestId("homepage-post");
    const renderedPostCount = await posts.count();

    expect(renderedPostCount).toBeLessThanOrEqual(2);
    for (let index = 0; index < renderedPostCount; index += 1) {
      await expect(posts.nth(index).getByRole("link")).toHaveAttribute("href", new RegExp(`^${escapeForRegExp(atConfiguredBase(locale === "zh" ? "/blog/" : "/en/blog/"))}`));
    }
  });

  test(`${locale} homepage keeps the approved three-region structure`, async ({ page }) => {
    await page.goto(atConfiguredBase(route));
    expect(await page.locator("main > *").evaluateAll((elements) => elements.map((element) => element.getAttribute("data-testid")))).toEqual([
      "homepage-intro",
      "content-counts",
      "homepage-latest-posts"
    ]);
    await expect(page.locator('[data-testid="homepage-intro"] section')).toHaveCount(1);
    await expect(page.locator('[data-testid="homepage-intro"] section')).toHaveAttribute("aria-labelledby", "interests-heading");
    await expect(page.locator('[data-testid="homepage-latest-posts"] section')).toHaveCount(0);
  });
}

for (const route of routes) {
  test(`${route} excludes rejected CTA, feature, research-direction, and CV-download patterns`, async ({ page }) => {
    await page.goto(atConfiguredBase(route));
    await expectNoRejectedControls(page, route.startsWith("/en/") ? "en" : "zh");
  });
}

for (const [route, expectedStructure] of [
  ["/about/", ["about-content"]],
  ["/en/about/", ["about-content"]]
] as const) {
  test(`${route} keeps the approved single-article structure`, async ({ page }) => {
    await page.goto(atConfiguredBase(route));
    expect(await page.locator("main > *").evaluateAll((elements) => elements.map((element) => element.getAttribute("data-testid")))).toEqual(expectedStructure);
    expect(await page.getByTestId("about-content").locator(":scope > *").evaluateAll((elements) => elements.map((element) => element.getAttribute("aria-labelledby") ?? element.tagName.toLowerCase()))).toEqual([
      "header", "about-interests", "education", "experience", "honors", "service", "skills", "contact", "profiles"
    ]);
    await expect(page.getByTestId("about-content").locator("section section")).toHaveCount(0);
  });
}

test("homepages match localized empty states to their rendered same-locale posts", async ({ page }) => {
  for (const { route, emptyPostsMessage } of localizedPages) {
    await page.goto(atConfiguredBase(route));
    const renderedPostCount = await page.getByTestId("homepage-post").count();

    await expect(page.getByText(emptyPostsMessage, { exact: true })).toHaveCount(renderedPostCount === 0 ? 1 : 0);
  }
});

for (const [route, heading, emptyMessage] of [
  ["/publications/", "论文成果", "暂时没有已发布的论文成果。"],
  ["/en/publications/", "Publications", "No publications have been published yet."]
] as const) {
  test(`${route} renders its localized publication index with progressive-enhancement filters`, async ({ page }) => {
    await page.goto(atConfiguredBase(route));
    await expect(page.getByTestId("publications-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    const publications = page.locator("[data-publication]");
    await expect(page.getByText(emptyMessage, { exact: true })).toHaveCount(await publications.count() === 0 ? 1 : 0);
    await expect(page.getByLabel(/年份|Year/)).toBeVisible();
    await expect(page.getByLabel(/成果类型|Type/)).toBeVisible();
  });
}

test("publication filters leave the static publication index readable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto(atConfiguredBase("/publications/"));
    await expect(page.getByTestId("publications-page")).toBeVisible();
    const publications = page.locator("[data-publication]");
    await expect(page.getByText("暂时没有已发布的论文成果。", { exact: true })).toHaveCount(await publications.count() === 0 ? 1 : 0);
    for (const publication of await publications.all()) await expect(publication).toBeVisible();
    await expect(page.getByLabel("年份")).toBeVisible();
    await expect(page.getByLabel("成果类型")).toBeVisible();
  } finally {
    await context.close();
  }
});

for (const [route, title, alternateRoute] of [
  ["/projects/robust-feature-selection/", "鲁棒特征选择", "/en/projects/robust-feature-selection/"],
  ["/en/projects/robust-feature-selection/", "Robust Feature Selection", "/projects/robust-feature-selection/"]
] as const) {
  test(`project ${route} renders its localized seed record and language alternate`, async ({ page }) => {
    const response = await page.goto(atConfiguredBase(route));
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.locator(".language-switch a").last()).toHaveAttribute("href", atConfiguredBase(alternateRoute));
    const coverAlt = route.startsWith("/en/") ? "Isolated fixture project cover" : "隔离测试项目封面";
    await expect(page.getByRole("img", { name: coverAlt })).toHaveAttribute("src", atConfiguredBase("/fixtures/project-cover.svg"));
  });
}

test("project drafts are not generated", async ({ page }) => {
  for (const route of ["/projects/draft-project/", "/en/projects/draft-project/"]) {
    const response = await page.goto(atConfiguredBase(route));
    expect(response?.status()).toBe(404);
  }
});

test("project Markdown keeps base-aware paths while raw HTML is not rendered", async ({ page }) => {
  await page.goto(atConfiguredBase("/projects/robust-feature-selection/"));
  await expect(page.getByRole("link", { name: "内部资源" })).toHaveAttribute("href", atConfiguredBase("/project-assets/"));
  await expect(page.locator("[data-project-raw-html]")).toHaveCount(0);
  await expect(page.getByText("Fixture project publication", { exact: true })).toBeVisible();
});

test("project Markdown reserves the layout main-content ID and keeps its anchor stable", async ({ page }) => {
  await page.goto(atConfiguredBase("/projects/robust-feature-selection/"));
  const duplicateIds = await page.locator("[id]").evaluateAll((elements) => {
    const counts = new Map<string, number>();
    for (const element of elements) counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
    return [...counts].filter(([, count]) => count > 1).map(([id]) => id);
  });

  expect(duplicateIds).toEqual([]);
  await expect(page.locator("main#main-content")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 2, name: "Main content" })).toHaveAttribute("id", "main-content-2");
});

for (const locale of ["zh", "en"] as const) {
  const prefix = locale === "zh" ? "" : "/en";
  const other = locale === "zh" ? "/en" : "";
  test(`blog ${locale} isolates routes and renders safe body, TOC, metadata and related posts`, async ({ page }) => {
    const response = await page.goto(atConfiguredBase(`${prefix}/blog/fixture-alpha/`));
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${locale} fixture-alpha`);
    await expect(page.locator("html")).toHaveAttribute("lang", locale === "zh" ? "zh-CN" : "en");
    await expect(page.locator(".language-switch a").last()).toHaveAttribute("href", atConfiguredBase(`${other}/blog/fixture-alpha/`));
    await expect(page.getByRole("img", { name: `${locale} fixture cover`, exact: true })).toHaveAttribute("src", atConfiguredBase("/fixtures/project-cover.svg"));
    await expect(page.getByRole("img", { name: "Body image", exact: true })).toHaveAttribute("src", atConfiguredBase("/fixtures/project-cover.svg"));
    await expect(page.getByRole("link", { name: "Fixture resource" })).toHaveAttribute("href", atConfiguredBase("/fixtures/project-cover.svg"));
    await expect(page.locator("[data-blog-raw-html]")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Unsafe", exact: true })).toHaveAttribute("href", "");
    await expect(page.locator("time[datetime='2025-02-03T00:00:00.000Z']")).toBeVisible();
    await expect(page.locator("time[datetime='2025-03-01T00:00:00.000Z']")).toBeVisible();
    await expect(page.getByTestId("post-toc").getByRole("link", { name: "Main content" })).toHaveAttribute("href", "#main-content-2");
    const ids = await page.locator("[id]").evaluateAll((els) => els.map((el) => el.id));
    expect(new Set(ids).size).toBe(ids.length);
    await expect(page.getByTestId("related-posts").getByRole("link", { name: `${locale} fixture-related`, exact: true })).toBeVisible();
    await expect(page.getByTestId("related-posts")).not.toContainText("fixture-secret");
    await expect(page.getByTestId("related-posts")).not.toContainText(`${locale === "zh" ? "en" : "zh"} fixture`);
    const violations = (await new AxeBuilder({ page }).analyze()).violations;
    expect(violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`blog ${locale} static list stays complete without JavaScript and when search index fails`, async ({ browser, page }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      const staticPage = await context.newPage();
      await staticPage.goto(atConfiguredBase(`${prefix}/blog/`));
      for (const slug of ["fixture-alpha", "fixture-beta", "fixture-related"]) {
        await expect(staticPage.getByRole("link", { name: `${locale} ${slug}`, exact: true })).toBeVisible();
      }
      const docs = await (await page.request.get(atConfiguredBase("/search-index.json"))).json();
      const expectedPosts = docs.filter((doc: { language: string }) => doc.language === locale);
      await expect(staticPage.locator("[data-blog-post]")).toHaveCount(expectedPosts.length);
      for (const row of await staticPage.locator("[data-blog-post]").all()) {
        await expect(row).toBeVisible();
        await expect(row).not.toContainText("fixture-secret");
      }
    } finally { await context.close(); }
    await page.route("**/search-index.json", (route) => route.abort());
    await page.goto(atConfiguredBase(`${prefix}/blog/`));
    await expect(page.getByRole("link", { name: `${locale} fixture-alpha`, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: `${locale} fixture-beta`, exact: true })).toBeVisible();
    await expect(page.getByTestId("blog-search")).toBeDisabled();
  });

  test(`search ${locale} combines body text category and tag without leaking the other language`, async ({ page }) => {
    await page.goto(atConfiguredBase(`${prefix}/blog/`));
    const search = page.getByTestId("blog-search");
    await expect(search).toBeEnabled();
    await search.fill(locale === "zh" ? "独有术语" : "quantumbanana");
    const visible = page.locator("[data-blog-post]:visible");
    await expect(visible).toHaveCount(1);
    await expect(visible).toContainText(`${locale} fixture-alpha`);
    await search.fill("");
    await page.getByTestId("blog-category").selectOption("Methods");
    await page.getByTestId("blog-tag").selectOption("alpha");
    await expect(page.getByRole("link", { name: `${locale} fixture-alpha`, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: `${locale} fixture-beta`, exact: true })).toBeHidden();
    await search.fill("zzznomatchzzz");
    await expect(visible).toHaveCount(0);
    await expect(page.getByTestId("blog-no-results")).toBeVisible();
    await search.fill("");
    await page.getByTestId("blog-category").selectOption("");
    await page.getByTestId("blog-tag").selectOption("");
    const links = await visible.locator("h2 a").evaluateAll((els) => els.map((el) => el.getAttribute("href")));
    expect(links.every((href) => href?.startsWith(atConfiguredBase(`${prefix}/blog/`)))).toBe(true);
    expect(links.indexOf(atConfiguredBase(`${prefix}/blog/fixture-alpha/`))).toBeLessThan(links.indexOf(atConfiguredBase(`${prefix}/blog/fixture-beta/`)));
  });

  test(`RSS ${locale} contains only published locale URLs under SITE_URL`, async ({ request }) => {
    const response = await request.get(atConfiguredBase(`${prefix}/rss.xml`));
    expect(response.status()).toBe(200);
    const xml = await response.text();
    const site = new URL(process.env.SITE_URL || "http://localhost:4321");
    expect(xml).toContain(`${site.origin}${atConfiguredBase(`${prefix}/blog/fixture-alpha/`)}`);
    expect(xml).toContain(`${locale} fixture-alpha`);
    expect(xml).not.toContain(`${locale === "zh" ? "en" : "zh"} fixture-alpha`);
    expect(xml).not.toContain("fixture-secret");
  });
}

test("blog untranslated switch falls back to index and draft routes never exist", async ({ page }) => {
  await page.goto(atConfiguredBase("/blog/fixture-single/"));
  await expect(page.locator(".language-switch a").last()).toHaveAttribute("href", atConfiguredBase("/en/blog/"));
  await expect(page.getByRole("img", { name: "zh fixture-single", exact: true })).toHaveAttribute("src", atConfiguredBase("/fixtures/project-cover.svg"));
  for (const route of ["/en/blog/fixture-single/", "/blog/fixture-secret/", "/en/blog/fixture-secret/"]) {
    expect((await page.goto(atConfiguredBase(route)))?.status()).toBe(404);
  }
});

test("search JSON includes both published languages and excludes drafts", async ({ request }) => {
  const response = await request.get(atConfiguredBase("/search-index.json"));
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  const docs = await response.json();
  for (const [language, prefix] of [["zh", ""], ["en", "/en"]]) {
    expect(docs).toContainEqual(expect.objectContaining({ language, title: `${language} fixture-alpha`, url: atConfiguredBase(`${prefix}/blog/fixture-alpha/`), text: expect.stringContaining("quantumbanana") }));
  }
  expect(JSON.stringify(docs)).not.toContain("fixture-secret");
});
