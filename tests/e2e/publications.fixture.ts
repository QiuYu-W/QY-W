import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const base = new URL(process.env.SITE_URL || "http://localhost:4321").pathname.replace(/\/$/, "");

for (const [route, translationLabel] of [["/publications/", "中文译名"], ["/en/publications/", "Chinese translation"]] as const) {
  test(`${route} controlled publications filter by year/type and keep exact author emphasis`, async ({ page }) => {
    await page.goto(`${base}${route}`);
    const records = page.locator("[data-publication]");
    const visibleRecords = page.locator("[data-publication]:visible h3");
    const visibleYears = page.locator("[data-publication-year-group]:visible h2");
    await expect(records).toHaveCount(4);
    await expect(visibleYears).toHaveText(["2026", "2025", "2024"]);
    await expect(page.locator(".authors strong")).toHaveText(["F. OWNER", "测试作者", "fixture owner"]);
    await expect(page.locator(".authors strong", { hasText: "Fixture Owner Jr." })).toHaveCount(0);
    await page.locator("[data-publication-year]").selectOption("2024");
    await expect(visibleRecords).toHaveText(["Fixture old journal"]);
    await expect(visibleYears).toHaveText(["2024"]);
    await page.locator("[data-publication-type]").selectOption("conference");
    await expect(visibleRecords).toHaveCount(0);
    await expect(visibleYears).toHaveCount(0);
    await page.locator("[data-publication-year]").selectOption("");
    await expect(visibleRecords).toHaveText(["Fixture new conference"]);
    await expect(visibleYears).toHaveText(["2026"]);
    await page.locator("[data-publication-type]").selectOption("journal");
    await expect(visibleRecords).toHaveText(["Fixture new journal", "Fixture project publication", "Fixture old journal"]);
    await page.locator("[data-publication-type]").selectOption("");
    await expect(visibleRecords).toHaveCount(4);
    await expect(visibleYears).toHaveText(["2026", "2025", "2024"]);
    const violations = (await new AxeBuilder({ page }).analyze()).violations;
    expect(violations.filter(({ impact }) => ["serious", "critical"].includes(impact ?? ""))).toEqual([]);
  });

  test(`${route} identifies the optional Chinese translation to screen readers`, async ({ page }) => {
    await page.goto(`${base}${route}`);
    const translation = page.locator(".translated-title");
    await expect(translation).toMatchAriaSnapshot(`- paragraph: "${translationLabel}: 测试中文译名"`);
  });

  test(`${route} controlled publications remain fully readable without JavaScript`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await page.goto(`${base}${route}`);
      await expect(page.locator("[data-publication]:visible h3")).toHaveText(["Fixture new conference", "Fixture new journal", "Fixture project publication", "Fixture old journal"]);
      await expect(page.locator("[data-publication-year-group]:visible h2")).toHaveText(["2026", "2025", "2024"]);
      // Selecting a disabled-enhancement filter cannot remove static content.
      await page.locator("[data-publication-year]").selectOption("2024");
      await expect(page.locator("[data-publication]:visible")).toHaveCount(4);
    } finally {
      await context.close();
    }
  });
}
