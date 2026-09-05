import { defineConfig, devices } from "@playwright/test";

const basePath = new URL(process.env.SITE_URL || "http://localhost:4321").pathname;
const origin = "http://127.0.0.1:4338";

export default defineConfig({
  testDir: "tests/e2e",
  globalTimeout: 180_000,
  retries: 0,
  // Build before accepting requests: dev compilation can reload the first Axe context.
  webServer: {
    command: "pnpm build && pnpm preview --host 127.0.0.1 --port 4338 --ignore-lock",
    url: `${origin}${basePath}`,
    reuseExistingServer: false,
    timeout: 90_000,
    // Prevent Astro's automatic agent backgrounding; Playwright owns this server.
    env: { ASTRO_PREVIEW_BACKGROUND: "1" }
  },
  use: {
    baseURL: origin,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } }
  ]
});
