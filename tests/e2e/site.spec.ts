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
