import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = ["/", "/en/", "/about/", "/en/about/"];
const localizedPages = [
  { route: "/", locale: "zh", labels: ["论文成果", "科研项目", "博客文章"], hrefs: ["/publications/", "/projects/", "/blog/"] },
  { route: "/en/", locale: "en", labels: ["Publications", "Projects", "Blog posts"], hrefs: ["/en/publications/", "/en/projects/", "/en/blog/"] }
] as const;

async function expectNoRejectedControls(page: import("@playwright/test").Page) {
  await expect(page.locator("main button, main [role=button], main a[download]")).toHaveCount(0);
  await expect(page.locator("main aside")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /精选成果|Featured (?:results|work)|研究方向|Research directions/i })).toHaveCount(0);
}

for (const route of routes) {
  test(`${route} renders without serious accessibility violations`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
  });
}

for (const { route, locale, labels, hrefs } of localizedPages) {
  test(`${locale} homepage exposes one localized count row with three linked numeric totals`, async ({ page }) => {
    await page.goto(route);
    const countRows = page.getByTestId("content-counts");
    await expect(countRows).toHaveCount(1);

    const links = countRows.getByRole("link");
    await expect(links).toHaveCount(3);
    for (const [index, label] of labels.entries()) {
      await expect(links.nth(index)).toHaveAccessibleName(new RegExp(`^\\d+ ${label}$`));
      await expect(links.nth(index)).toHaveAttribute("href", hrefs[index]);
    }
  });

  test(`${locale} homepage limits posts to two and keeps any rendered post in its locale`, async ({ page }) => {
    await page.goto(route);
    const posts = page.getByTestId("homepage-post");
    expect(await posts.count()).toBeLessThanOrEqual(2);
    for (let index = 0; index < await posts.count(); index += 1) {
      await expect(posts.nth(index).getByRole("link")).toHaveAttribute("href", locale === "zh" ? /^\/blog\// : /^\/en\/blog\//);
    }
  });
}

for (const route of routes) {
  test(`${route} excludes rejected CTA, feature, research-direction, and CV-download patterns`, async ({ page }) => {
    await page.goto(route);
    await expectNoRejectedControls(page);
  });
}

test("homepages explain empty same-locale post collections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("暂时没有已发布的博客文章。")).toBeVisible();

  await page.goto("/en/");
  await expect(page.getByText("No blog posts have been published yet.")).toBeVisible();
});
