import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  webServer: { command: "pnpm dev", url: "http://127.0.0.1:4321", reuseExistingServer: !process.env.CI },
  use: { baseURL: "http://127.0.0.1:4321" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }
  ]
});
