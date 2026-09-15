import { defineConfig } from "@playwright/test";
import config from "./playwright.config";

export default defineConfig({
  ...config,
  testMatch: ["site.spec.ts", "publications.fixture.ts"],
  globalSetup: "./tests/e2e/publications-fixture-setup.ts"
});
