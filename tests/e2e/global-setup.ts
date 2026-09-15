import { preview } from "astro";

const host = "127.0.0.1";
const port = Number(process.env.PLAYWRIGHT_PORT || "4338");
const origin = `http://${host}:${port}`;
const basePath = `${new URL(process.env.SITE_URL || "http://localhost:4321").pathname.replace(/\/$/, "")}/`;

export default async function globalSetup() {
  const server = await preview({
    root: process.cwd(),
    server: { host, port },
    vite: { preview: { strictPort: true } }
  });

  let stopping: Promise<void> | undefined;
  const stop = () => stopping ??= Promise.resolve().then(() => server.stop());

  try {
    if (server.port !== port) {
      throw new Error(`Preview requested port ${port} but bound port ${server.port}`);
    }
    const response = await fetch(`${origin}${basePath}`, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      throw new Error(`Preview readiness check failed for ${origin}${basePath}: ${response.status}`);
    }
  } catch (error) {
    await stop();
    throw error;
  }

  return async () => {
    await stop();
  };
}
