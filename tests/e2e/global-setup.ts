import preview from "../../node_modules/astro/dist/core/preview/index.js";

const host = "127.0.0.1";
const port = Number(process.env.PLAYWRIGHT_PORT || "4338");
const origin = `http://${host}:${port}`;
const basePath = new URL(process.env.SITE_URL || "http://localhost:4321").pathname;

export default async function globalSetup() {
  const server = await preview({
    root: process.cwd(),
    server: { host, port }
  });

  try {
    const response = await fetch(`${origin}${basePath}`);
    if (!response.ok) {
      throw new Error(`Preview readiness check failed for ${origin}${basePath}: ${response.status}`);
    }
  } catch (error) {
    await server.stop();
    throw error;
  }

  return async () => {
    await server.stop();
  };
}
