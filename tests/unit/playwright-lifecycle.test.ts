import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  scripts: Record<string, string>;
};
const playwrightConfig = readFileSync(new URL("../../playwright.config.ts", import.meta.url), "utf8");

describe("Playwright preview lifecycle", () => {
  it("builds before Playwright and uses in-process preview setup with an awaited teardown", () => {
    expect(packageJson.scripts["test:e2e"]).toBe("pnpm build && playwright test");
    expect(playwrightConfig).toContain('globalSetup: "./tests/e2e/global-setup.ts"');
    expect(playwrightConfig).not.toContain("webServer:");
    expect(playwrightConfig).not.toContain("pnpm preview");
    const globalSetup = readFileSync(new URL("../e2e/global-setup.ts", import.meta.url), "utf8");
    expect(globalSetup).toContain('await server.stop()');
  });
});
