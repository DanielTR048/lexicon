import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { THEMES } from "../src/data.js";
import { generatePuzzle } from "../src/engine.js";

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  serviceWorkers: "allow",
});
let server;
let origin;
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

test.beforeAll(async () => {
  const directory = resolve(process.env.LEXICON_TEST_DIST || "dist");
  server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    const mount = [
      "/repositorio-do-jogo/",
      "/outro-jogo/",
      "/site-canonico/",
    ].find((prefix) => pathname.startsWith(prefix));
    if (!mount) {
      response.writeHead(404).end();
      return;
    }
    // Sites canonicalizes index.html to the directory URL. Cache Storage retains
    // the redirected flag even though the final response has status 200.
    if (mount === "/site-canonico/" && pathname === `${mount}index.html`) {
      response.writeHead(301, { Location: mount }).end();
      return;
    }
    const path = resolve(
      directory,
      pathname.slice(mount.length) || "index.html",
    );
    if (!path.startsWith(directory + sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const data = await readFile(path);
      response
        .writeHead(200, {
          "Content-Type": mime[extname(path)] || "application/octet-stream",
          Vary: "Origin",
          "Cache-Control": "no-cache",
        })
        .end(data);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  origin = `http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async () => new Promise((done) => server.close(done)));

async function openGame(page, path = "/repositorio-do-jogo/") {
  await page.goto(origin + path);
  await expect(page.getByRole("grid")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "data-offline-ready",
    "true",
  );
}

test("project subdirectory loads icons and artwork, keeps independent caches, and restores a game offline with a query string", async ({
  page,
  context,
}) => {
  const failures = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400)
      failures.push(`${response.status()} ${response.url()}`);
  });
  await openGame(page);
  const manifest = await page.evaluate(async () =>
    (await fetch(document.querySelector('link[rel="manifest"]').href)).json(),
  );
  expect(manifest.start_url).toBe("./?origem=instalado");
  expect(manifest.scope).toBe("./");
  expect(manifest.icons.map(({ sizes }) => sizes)).toEqual([
    "192x192",
    "512x512",
    "512x512",
  ]);
  await expect(page.locator(".install-card")).toHaveAttribute(
    "data-offline",
    "ready",
  );
  await page.screenshot({ path: "output/pwa-mobile.png" });
  expect(
    await page
      .locator(".hero-art img")
      .evaluate((image) => image.complete && image.naturalWidth > 0),
  ).toBe(true);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lexicon-lab-v1")),
  );
  const theme = THEMES.find(({ id }) => id === saved.session.themeId);
  const puzzle = generatePuzzle({
    words: theme.words,
    difficulty: saved.session.difficulty,
    seed: saved.session.seed,
  });
  const found = puzzle.placements[0];
  for (const { row, col } of [found.cells[0], found.cells.at(-1)])
    await page
      .locator(`.letter-cell[data-row="${row}"][data-col="${col}"]`)
      .click();
  await expect(
    page.locator(`.word-item[data-word="${found.normalized}"]`),
  ).toHaveClass(/found/);
  const other = await context.newPage();
  await openGame(other, "/outro-jogo/");
  const cachesBefore = await page.evaluate(() => caches.keys());
  expect(cachesBefore.filter((key) => key.startsWith("lexicon-"))).toHaveLength(
    2,
  );
  await other.close();
  await context.setOffline(true);
  const navigation = await page.goto(
    origin + "/repositorio-do-jogo/?origem=instalado",
  );
  expect(navigation.fromServiceWorker()).toBe(true);
  await expect(
    page.locator(`.word-item[data-word="${found.normalized}"]`),
  ).toHaveClass(/found/);
  await expect(page.locator("html")).toHaveAttribute(
    "data-offline-ready",
    "true",
  );
  expect(
    await page
      .locator(".install-icon")
      .evaluate((image) => image.complete && image.naturalWidth === 192),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await context.setOffline(false);
  expect(failures).toEqual([]);
});

test("install requires a tap, cancellation preserves the game, and the Android button downloads the real APK", async ({
  page,
}) => {
  const apkRequests = [];
  page.on("request", (request) => {
    if (request.url().endsWith(".apk")) apkRequests.push(request.url());
  });
  await openGame(page);
  const androidLink = page.getByRole("link", { name: "Baixar Android" });
  await expect(androidLink).toBeVisible();
  expect(apkRequests).toEqual([]);
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("lexicon-lab-v1")).session,
  );
  await page.evaluate(() => {
    window.promptCalls = 0;
    const prompt = new Event("beforeinstallprompt", { cancelable: true });
    prompt.prompt = async () => {
      window.promptCalls++;
    };
    prompt.userChoice = Promise.resolve({ outcome: "dismissed" });
    dispatchEvent(prompt);
  });
  await expect(
    page.getByRole("button", { name: "Instalar jogo", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.promptCalls)).toBe(0);
  await page
    .getByRole("button", { name: "Instalar jogo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Como instalar", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => window.promptCalls)).toBe(1);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("lexicon-lab-v1")).session,
    ),
  ).toEqual(before);
  await page
    .getByRole("button", { name: "Como instalar", exact: true })
    .click();
  await expect(page.locator(".install-help")).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await androidLink.click();
  const download = await downloadEvent;
  const apk = await readFile(await download.path());
  expect(apk.equals(await readFile("public/android/lexicon.apk"))).toBe(true);
  await page
    .getByRole("button", { name: "Fechar sugestão de instalação" })
    .click();
  await expect(page.locator(".install-card")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("grid")).toBeVisible();
  await expect(page.locator(".install-card")).toHaveCount(0);
});

test("installed mode hides the install suggestion", async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query) =>
      query === "(display-mode: standalone)"
        ? { matches: true, addEventListener() {} }
        : original(query);
  });
  await openGame(page);
  await expect(page.locator(".install-card")).toHaveCount(0);
});

test("the browser owns confirmation and accepting installation closes the suggestion", async ({
  page,
}) => {
  await openGame(page);
  await page.evaluate(() => {
    const prompt = new Event("beforeinstallprompt", { cancelable: true });
    prompt.prompt = async () => {};
    prompt.userChoice = new Promise((resolve) => {
      window.confirmInstallation = resolve;
    });
    dispatchEvent(prompt);
  });
  await page
    .getByRole("button", { name: "Instalar jogo", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Aguardando confirmação…", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() =>
    window.confirmInstallation({ outcome: "accepted" }),
  );
  await expect(page.locator(".install-card")).toHaveCount(0);
  await expect(page.getByRole("grid")).toBeVisible();
});

test("offline-ready is withdrawn when a required cached asset is missing", async ({
  page,
}) => {
  await openGame(page);
  await page.evaluate(async () => {
    const keys = await caches.keys();
    const cache = await caches.open(
      keys.find((key) => key.startsWith("lexicon-")),
    );
    const requests = await cache.keys();
    await cache.delete(
      requests.find(({ url }) => url.endsWith("/icons/icon-192.png")),
      { ignoreVary: true },
    );
    dispatchEvent(new Event("online"));
  });
  await expect(page.locator("html")).toHaveAttribute(
    "data-offline-ready",
    "false",
  );
  await expect(page.locator(".install-card")).toHaveAttribute(
    "data-offline",
    "unavailable",
  );
  await expect(page.locator(".install-status")).not.toContainText("Pronto");
});

test("offline navigation works when hosting redirects index.html to its canonical directory", async ({
  page,
  context,
}) => {
  await openGame(page, "/site-canonico/");
  const cachedShells = await page.evaluate(async () => {
    const root = await caches.match(location.href, { ignoreVary: true });
    const index = await caches.match(
      new URL("index.html", location.href).href,
      { ignoreVary: true },
    );
    return {
      root: { status: root.status, redirected: root.redirected },
      index: { status: index.status, redirected: index.redirected },
    };
  });
  expect(cachedShells).toEqual({
    root: { status: 200, redirected: false },
    index: { status: 200, redirected: true },
  });
  const seed = await page.evaluate(
    () => JSON.parse(localStorage.getItem("lexicon-lab-v1")).session.seed,
  );
  await context.setOffline(true);
  try {
    const navigation = await page.goto(
      origin + "/site-canonico/?origem=instalado",
    );
    expect(navigation.fromServiceWorker()).toBe(true);
    await expect(page.getByRole("grid")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute(
      "data-offline-ready",
      "true",
    );
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("lexicon-lab-v1")).session.seed,
      ),
    ).toBe(seed);
    const reload = await page.reload();
    expect(reload.fromServiceWorker()).toBe(true);
    await expect(page.getByRole("grid")).toBeVisible();
    expect(
      await page
        .locator(".hero-art img")
        .evaluate((image) => image.complete && image.naturalWidth > 0),
    ).toBe(true);
  } finally {
    await context.setOffline(false);
  }
});
