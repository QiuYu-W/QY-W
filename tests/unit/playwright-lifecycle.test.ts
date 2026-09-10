import type { preview } from "astro";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const previewMock = vi.hoisted(() => vi.fn<typeof preview>());
vi.mock("astro", () => ({ preview: previewMock }));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function serverFixture(port = 44338) {
  const stopped = deferred();
  const stopStarted = deferred();
  const stop = vi.fn(() => {
    stopStarted.resolve();
    return stopped.promise;
  });
  const server: Awaited<ReturnType<typeof preview>> = {
    host: "127.0.0.1", port, closed: () => stopped.promise, stop
  };
  previewMock.mockResolvedValue(server);
  return { stop, stopped, stopStarted };
}

async function runSetup() {
  const { default: setup } = await import("../e2e/global-setup");
  return setup();
}

describe("Playwright preview lifecycle", () => {
  beforeEach(() => {
    vi.resetModules();
    previewMock.mockReset();
    vi.stubEnv("PLAYWRIGHT_PORT", "44338");
    vi.stubEnv("SITE_URL", "https://example.com/QY-W/");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("checks the actual slash-terminated project homepage when SITE_URL has no trailing slash", async () => {
    const server = createServer((request, response) => {
      response.statusCode = request.url === "/QY-W/" ? 200 : 404;
      response.end("fixture homepage");
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const port = (server.address() as AddressInfo).port;
    const stop = () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    vi.stubEnv("PLAYWRIGHT_PORT", String(port));
    vi.stubEnv("SITE_URL", "https://example.com/QY-W");
    previewMock.mockResolvedValue({ host: "127.0.0.1", port, stop, closed: async () => {} });
    try {
      const teardown = await runSetup();
      await teardown();
      expect(server.listening).toBe(false);
    } finally {
      if (server.listening) await stop();
    }
  });

  it("uses the public preview API with strict port ownership and the configured readiness URL", async () => {
    const { stop, stopped } = serverFixture();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("ready"));
    vi.stubGlobal("fetch", fetchMock);
    const teardown = await runSetup();
    stopped.resolve();
    await teardown();

    expect(previewMock).toHaveBeenCalledExactlyOnceWith({
      root: process.cwd(), server: { host: "127.0.0.1", port: 44338 },
      vite: { preview: { strictPort: true } }
    });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("http://127.0.0.1:44338/QY-W/", {
      signal: expect.any(AbortSignal)
    });
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("returns teardown that awaits stop exactly once even for concurrent or repeated calls", async () => {
    const { stop, stopped, stopStarted } = serverFixture();
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response("ready")));
    const teardown = await runSetup();
    expect(stop).not.toHaveBeenCalled();

    let complete = false;
    const first = teardown().then(() => { complete = true; });
    const second = teardown();
    await stopStarted.promise;
    expect(complete).toBe(false);
    const callsWhileStopping = stop.mock.calls.length;
    stopped.resolve();
    await Promise.all([first, second]);
    await teardown();
    expect(complete).toBe(true);
    expect(callsWhileStopping).toBe(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it.each(["http", "network"])("awaits exactly one stop before rejecting %s readiness failure", async (failure) => {
    const { stop, stopped, stopStarted } = serverFixture();
    const fetchMock = vi.fn<typeof fetch>();
    if (failure === "http") fetchMock.mockResolvedValue(new Response("unavailable", { status: 503 }));
    else fetchMock.mockRejectedValue(new Error("connection refused"));
    vi.stubGlobal("fetch", fetchMock);
    let settled = false;
    const outcome = runSetup().then(
      (teardown) => { settled = true; return teardown; },
      (error: unknown) => { settled = true; return error; }
    );
    await stopStarted.promise;
    expect(settled).toBe(false);
    stopped.resolve();
    expect(await outcome).toBeInstanceOf(Error);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a mismatched port before fetching a foreign listener and awaits exactly one stop", async () => {
    const { stop, stopped } = serverFixture(44339);
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("foreign server"));
    vi.stubGlobal("fetch", fetchMock);
    let settled = false;
    const outcome = runSetup().then(
      (teardown) => { settled = true; return teardown; },
      (error: unknown) => { settled = true; return error; }
    );
    // Wait for the boundary decision, not an arbitrary amount of wall-clock time.
    await vi.waitFor(() => expect(stop.mock.calls.length > 0 || settled).toBe(true));
    const settledBeforeStop = settled;
    stopped.resolve();
    const result = await outcome;
    // Clean up the old broken implementation as well, so red cannot leak resources.
    if (typeof result === "function") await result();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(settledBeforeStop).toBe(false);
    expect(result).toBeInstanceOf(Error);
    expect(String(result)).toMatch(/44338.*44339/);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("propagates an occupied-port startup rejection without fetching or claiming a server", async () => {
    const { stop } = serverFixture();
    const occupied = new Error("Port 44338 is already in use");
    previewMock.mockRejectedValue(occupied);
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    await expect(runSetup()).rejects.toBe(occupied);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(stop).not.toHaveBeenCalled();
    expect(previewMock).toHaveBeenCalledTimes(1);
  });
});
