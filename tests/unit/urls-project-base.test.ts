import { expect, it } from "vitest";
import { createServer } from "vite";

it("uses the configured project base for routes and root-relative assets", async () => {
  const server = await createServer({
    appType: "custom",
    base: "/QY-W/",
    configFile: false,
    root: process.cwd(),
    server: { middlewareMode: true }
  });

  try {
    const urls = await server.ssrLoadModule("/src/lib/urls.ts") as typeof import("../../src/lib/urls");

    expect(urls.routeFor("en", "projects", "robust-fs")).toBe("/QY-W/en/projects/robust-fs/");
    expect(urls.assetUrl("/images/portrait.jpg")).toBe("/QY-W/images/portrait.jpg");
  } finally {
    await server.close();
  }
});
