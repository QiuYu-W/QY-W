import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = ["/", "/en/", "/about/", "/en/about/"];

for (const route of routes) {
  test(`${route} renders without serious accessibility violations`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
  });
}

test("homepage shows linked live counts and no rejected sections", async ({ page }) => {
  await page.goto("/");
  const counts = page.getByLabel("内容概览");
  await expect(counts.getByRole("link", { name: /论文成果/ })).toBeVisible();
  await expect(counts.getByRole("link", { name: /科研项目/ })).toBeVisible();
  await expect(counts.getByRole("link", { name: /博客文章/ })).toBeVisible();
  await expect(page.getByText("精选成果")).toHaveCount(0);
  await expect(page.getByText(/下载简历/)).toHaveCount(0);
});

test("homepages explain empty same-locale post collections", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("暂时没有已发布的博客文章。")).toBeVisible();

  await page.goto("/en/");
  await expect(page.getByText("No blog posts have been published yet.")).toBeVisible();
});
